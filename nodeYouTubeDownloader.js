/*
 * nodeYouTubeDownloader v0.2
 * https://github.com/kejjang/node-youtube-downloader
 *
 * Copyright (C) 2013 Kej Jang <kejjang@gmail.com>
 * Released under the WTFPL
 * http://www.wtfpl.net/
 *
 * Date: 2013-09-26
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
		102: { desc: 'WebM, 1280 x 720, Stereo 44KHz Vorbis' , ext: 'webm' },
		133: { desc: 'MP4, 426 x 240, Stereo 44KHz AAC'      , ext: 'mp4' },
		134: { desc: 'MP4, 640 x 360, Stereo 44KHz AAC'      , ext: 'mp4' },
		135: { desc: 'MP4, 854 x 480, Stereo 44KHz AAC'      , ext: 'mp4' },
		136: { desc: 'MP4, 1280 x 720, Stereo 44KHz AAC'     , ext: 'mp4' },
		137: { desc: 'MP4, 1920 x 1080, Stereo 44KHz AAC'    , ext: 'mp4' },
		139: { desc: 'M4A, 48 kbit/s audio only'             , ext: 'm4a' },
		140: { desc: 'M4A, 128 kbit/s audio only'            , ext: 'm4a' },
		141: { desc: 'M4A, 256 kbit/s audio only'            , ext: 'm4a' },
		160: { desc: 'MP4, 256 x 144, Stereo 44KHz AAC'      , ext: 'mp4' },
		264: { desc: 'MP4, 1920 x 1080, Stereo 44KHz AAC'    , ext: 'mp4' }  // not sure
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
				//self.getVideoInfo_alternative(checkResult.vid, 'parseVideoInfo_alternative');
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
		var video_info_url = 'http://www.youtube.com/get_video_info?eurl=http://test.localhost.local/&sts=1586&video_id=' + vid;
		
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

	getVideoInfo_alternative: function(vid, callback){
		this.videoInfo.videoID = vid;
		var video_info_url = 'http://www.youtube.com/watch?v=' + vid;
		
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
				// console.log(video_info_url);
				// console.log(options);
				// console.log(infos);
				self[callback](infos);
			});
		});
	},

	parseVideoInfo: function(infos){
		var ignoreFormats = ['43', '44', '45', '46', '100', '101', '102', '264'];

		var queries = querystring.parse(infos);

		this.videoInfo.title = queries.title;
		var fmt_map = '';

		try{
			//fmt_map = queries.url_encoded_fmt_stream_map.split(',');
			fmt_map = queries.adaptive_fmts.split(',');
		}catch(err){}

		if(fmt_map == ''){
			this.getVideoInfo_alternative(this.videoInfo.videoID, 'parseVideoInfo_alternative');
		}else{
			process.stdout.write("\n" + this.videoInfo.title + "\n");

			var dlCount = 1;
			for(var i in fmt_map){
				fmt_map[i] = querystring.parse(fmt_map[i]);

				if(this.fmt_str[fmt_map[i].itag] == undefined){
					this.fmt_str[fmt_map[i].itag] = { desc: '(' + fmt_map[i].type + ')', ext:'' };
				}

				if(ignoreFormats.indexOf(fmt_map[i].itag) == -1){
					this.videoInfo.urls.push({ itag: fmt_map[i].itag, url: fmt_map[i].url + "&signature=" + this.getSignature(fmt_map[i])});
					process.stdout.write('[' + dlCount++ + '] ' + this.fmt_str[fmt_map[i].itag].desc + "\n");
				}
			}
			
			this.askDownload();
		}
	},

	parseVideoInfo_alternative: function(infos){
		var ignoreFormats = ['43', '44', '45', '46', '100', '101', '102', '264'];

		var regexp_title = new RegExp("<meta\\sname=\"title\"\\scontent=\"(.*?)\">", "ig");
		var result_title = regexp_title.exec(infos);

		var url_encoded_fmt_stream_map = '';
		//var regexp_fmt_map = new RegExp("\"url_encoded_fmt_stream_map\":\\s\"(.*?)\"", "ig");
		var regexp_fmt_map = new RegExp("\"adaptive_fmts\":\\s\"(.*?)\"", "ig");
		var result_fmt_map = regexp_fmt_map.exec(infos);
		var url_encoded_fmt_stream_map = '';

		try{
			this.videoInfo.title = result_title[1];
			// have a html entities issue, will fix later

			url_encoded_fmt_stream_map = result_fmt_map[1];
		}catch(err){}

		// console.log(url_encoded_fmt_stream_map);

		var fmt_map = '';

		try{
			fmt_map = url_encoded_fmt_stream_map.split(',');
		}catch(err){}

		if(fmt_map == ''){
			process.stdout.write("oh oh... something's wrong... ");
			this.askRestart();
		}else{
			process.stdout.write("\n" + this.videoInfo.title + "\n");

			var dlCount = 1;
			for(var i in fmt_map){
				fmt_map[i] = querystring.parse(fmt_map[i].replace(/\\u0026/g, '&'));

				if(this.fmt_str[fmt_map[i].itag] == undefined){
					this.fmt_str[fmt_map[i].itag] = { desc: '(' + fmt_map[i].type + ')', ext:'' };
				}

				if(ignoreFormats.indexOf(fmt_map[i].itag) == -1){
					this.videoInfo.urls.push({ itag: fmt_map[i].itag, url: fmt_map[i].url + "&signature=" + this.getSignature(fmt_map[i])});
					process.stdout.write('[' + dlCount++ + '] ' + this.fmt_str[fmt_map[i].itag].desc + "\n");
				}
			}

			this.askDownload();
		}
	},	

	getSignature: function(fmt){
		if(fmt.sig != null){
			return fmt.sig;
		}else if(fmt.s != null){
			return this.alternativeSignatureHandler(fmt.s);
		}

		return '';
	},

	alternativeSignatureHandler: function(s){
		var sArray = s.split("");
		var tmpA, tmpB;

		tmpA = sArray[0];
		tmpB = sArray[52];

		sArray[0] = tmpB;
		sArray[52] = tmpA;

		tmpA = sArray[83];
		tmpB = sArray[62];

		sArray[83] = tmpB;
		sArray[62] = tmpA;

		sArray = sArray.slice(3);
		sArray = sArray.reverse();
		sArray = sArray.slice(3);

		return sArray.join("");
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