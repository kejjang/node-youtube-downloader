/*
 * nodeYouTubeDownloader v0.1
 * https://github.com/kejjang/node-youtube-downloader
 *
 * Copyright (C) 2013 Kej Jang <kejjang@gmail.com>
 * Released under the WTFPL
 * http://www.wtfpl.net/
 *
 * Date: 2013-06-11
 */
var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    util = require('util'),
    querystring = require('querystring');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

var nodeYouTubeDownloader = {

	videoInfo: {
		videoID: '',
		title: '',
		urls: [],
		currentDownloadIndex: -1
	},

	fmt_str: {
		0:   { desc: 'FLV, 320 x 240, Mono 22KHz MP3'        , ext: 'flv' }, // delete ?
		5:   { desc: 'FLV, 400 x 240, Mono 44KHz MP3'        , ext: 'flv' },
		6:   { desc: 'FLV, 480 x 360, Mono 44KHz MP3'        , ext: 'flv' }, // delete ?
		34:  { desc: 'FLV, 640 x 360, Stereo 44KHz AAC'      , ext: 'flv' },
		35:  { desc: 'FLV, 854 x 480, Stereo 44KHz AAC'      , ext: 'flv' },
		13:  { desc: '3GP, 176 x 144, Stereo 8KHz'           , ext: '3gp' }, // delete ?
		17:  { desc: '3GP, 176 x 144, Stereo 44KHz AAC'      , ext: '3gp' },
		36:  { desc: '3GP, 320 x 240, Stereo 44KHz AAC'      , ext: '3gp' },
		18:  { desc: 'MP4, 640 x 360, Stereo 44KHz AAC'      , ext: 'mp4' },
		22:  { desc: 'MP4, 1280 x 720, Stereo 44KHz AAC'     , ext: 'mp4' },
		37:  { desc: 'MP4, 1920 x 1080, Stereo 44KHz AAC'    , ext: 'mp4' },
		38:  { desc: 'MP4, 4096 x 3072, Stereo 44KHz AAC'    , ext: 'mp4' },
		82:  { desc: 'MP4, 640 x 360, Stereo 44KHz AAC'      , ext: 'mp4' },
		83:  { desc: 'MP4, 854 x 240, Stereo 44KHz AAC'      , ext: 'mp4' },
		84:  { desc: 'MP4, 1280 x 720, Stereo 44KHz AAC'     , ext: 'mp4' },
		85:  { desc: 'MP4, 1920 x 520, Stereo 44KHz AAC'     , ext: 'mp4' },
		43:  { desc: 'WebM, 640 x 360, Stereo 44KHz Vorbis'  , ext: 'webm' },
		44:  { desc: 'WebM, 854 x 480, Stereo 44KHz Vorbis'  , ext: 'webm' },
		45:  { desc: 'WebM, 1280 x 720, Stereo 44KHz Vorbis' , ext: 'webm' },
		46:  { desc: 'WebM, 1920 x 540, Stereo 44KHz Vorbis' , ext: 'webm' },
		100: { desc: 'WebM, 640 x 360, Stereo 44KHz Vorbis'  , ext: 'webm' },
		101: { desc: 'WebM, 854 x 480, Stereo 44KHz Vorbis'  , ext: 'webm' },
		102: { desc: 'WebM, 1280 x 720, Stereo 44KHz Vorbis' , ext: 'webm' }
	},

	start: function(){
		this.videoInfo = { videoID: '', title: '', urls: [], currentDownloadIndex: -1 };

		process.stdout.write("paste youtube url here:\n> ");
		
		var self = this;
		process.stdin.once('data', function(chunk){
			var youtube_url = chunk.toString().trim();
			var checkResult = self.validYouTubeUrl(youtube_url);

			if(checkResult.valid){
				self.getVideoInfo(checkResult.vid, 'parseVideoInfo');
			} else {
				self.wrongUrl();
			}
		});
	},

	validYouTubeUrl: function(youtube_url){
		var valid = false;
		var vid = '';
		var pattern1 = /^https?:\/\/(.*?)?youtube.com/;
		var pattern2 = /^https?:\/\/youtu.be/;

		if(pattern1.test(youtube_url)) {
			if(youtube_url.indexOf('/v/') == -1) {
				var ua = url.parse(youtube_url, true);
				if(ua.query.v != null) {
					vid = ua.query.v;
					valid = true;
				} else if(ua.query.video_id != null) {
					vid = ua.query.video_id;
					valid = true;
				}
			} else {
				var url_parts = url.parse(youtube_url).path.split('/v/');
				vid = url_parts[1];
				valid = true;
			} 
		} else if(pattern2.test(youtube_url)) {
			vid = url.parse(youtube_url).pathname.substr(1);
			valid = true;
		}

		return {valid: valid, vid: vid};
	},
	
	wrongUrl: function(){
		process.stdout.write("sorry, wrong url... ");
		this.askRestart();
	},

	getVideoInfo: function(vid, callback){
		this.videoInfo.videoID = vid;
		var video_info_url = 'http://www.youtube.com/get_video_info?video_id=' + vid + '&eurl=http://test.localhost.local/';
		
		var options = {
			host: url.parse(video_info_url).host,
			port: 80,
			path: url.parse(video_info_url).path
		};

		var infos = '';
		var self = this;

		http.get(options, function(res) {
			res.on('data', function(data) {
				infos += data.toString();
			}).on('end', function() {
				self[callback](infos);
			});
		});
	},

	parseVideoInfo: function(infos){
		var ignoreFormats = ['43', '44', '45', '46', '100', '101', '102'];

		var queries = querystring.parse(infos);

		this.videoInfo.title = queries.title;
		var fmt_map = queries.url_encoded_fmt_stream_map.split(',');

		process.stdout.write("\n" + this.videoInfo.title + "\n");

		var dlCount = 1;
		for(var i in fmt_map){
			fmt_map[i] = querystring.parse(fmt_map[i]);

			if(this.fmt_str[fmt_map[i].itag] == undefined){
				this.fmt_str[fmt_map[i].itag] = { desc: '(' + fmt_map[i].type + ')', ext:'' };
			}

			if(ignoreFormats.indexOf(fmt_map[i].itag) == -1){
				this.videoInfo.urls.push({ itag: fmt_map[i].itag, url: fmt_map[i].url + "&signature=" + fmt_map[i].sig});
				process.stdout.write('[' + dlCount++ + '] ' + this.fmt_str[fmt_map[i].itag].desc + "\n");
			}
		}
		
		this.askDownload();
	},

	downloadFile: function(fileIndex){
		this.videoInfo.currentDownloadIndex = fileIndex;
		var file_url = this.videoInfo.urls[fileIndex].url;
		this.downloadFileRealUrl(file_url);
	},

	downloadFileRealUrl: function(file_url){
		var options = {
			host: url.parse(file_url).host,
			port: 80,
			path: url.parse(file_url).path
		};

		var self = this;

		http.get(options, function(res) {
			if([301, 302, 303, 307].indexOf(res.statusCode) > -1 && res.headers.location){
				self.downloadFileRealUrl(res.headers.location);
			}else{
				process.stdout.write("file size: " + (Math.round(parseInt(res.headers['content-length']) * 100.0 / (1024 * 1024)) / 100) + "MB.\n");
				
				var file_name = self.videoInfo.videoID + '.' + self.fmt_str[self.videoInfo.urls[self.videoInfo.currentDownloadIndex].itag].ext;
				var file = fs.createWriteStream(file_name);

				process.stdout.write("video is downloading and save as " + file_name + ", please wait...\n");

				res.on('data', function(data) {
					file.write(data);
				}).on('end', function() {
					file.end();
					process.stdout.write("video download complete.\n");
					setTimeout(function(){
						self.askRestart();
					}, 800);
				});
			}
		});

	},

	askDownload: function(){
		var self = this;
		process.stdout.write("\nwhich one do you want to download? or enter 0 to exit.\n> ");
		process.stdin.once('data', function(chunk){
			var ans = -1;
			try{
				ans = parseInt(chunk.toString().trim());
			}catch(err){}

			if(ans <= -1 || ans > self.videoInfo.urls.length){
				self.askDownload();
			} else if(ans == 0){
				self.askRestart();
			} else {
				self.downloadFile(ans - 1);
			}
		});
	},

	askRestart: function(){
		var self = this;
		process.stdout.write("wanna start over again? (Y/n)\n> ");
		process.stdin.once('data', function(chunk){
			var ans = chunk.toString().trim().toLowerCase().substr(0, 1);
			if(ans == 'y' || ans == ''){
				self.start();
			} else if (ans == 'n'){
				process.stdout.write("enjoy your video, bye bye.\n");
				process.exit();
			} else {
				self.askRestart();
			}
		});
	}
};

nodeYouTubeDownloader.start();