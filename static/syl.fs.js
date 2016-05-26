$(function() {
    syl.fs = {
	__records : [],
	Record : function(from, to, time, content) {
	    this.from = from;
	    this.to = to;
	    this.time = time;
	    this.content = content;
	},
	init : function() {
	    window.requestFileSystem = window.requestFileSystem
		    || window.webkitRequestFileSystem;
	    // this.req_quota();
	},
	read : function() {
	    window.requestFileSystem(window.TEMPORARY,
		    5 * 1024 * 1024 /* 5MB */, this.read_handler,
		    this.error_handler);
	    return this.__records;
	},
	write : function(records) {
	    this.__records = records;
	    window.requestFileSystem(window.TEMPORARY,
		    5 * 1024 * 1024 /* 5MB */, this.write_handler,
		    this.error_handler);
	},
	req_quota : function() {
	    window.webkitStorageInfo.requestQuota(PERSISTENT,
		    100 * 1024 * 1024, function(grantedBytes) {
			window.requestFileSystem(PERSISTENT, grantedBytes,
				this.quota_handler, this.error_handler);
		    }, function(e) {
			console.log('Error', e);
		    });
	},
	quota_handler : function(fs) {

	},

	get_filename : function() {
	    var filename = 'chat' + '1234'; // (from>to?to+'-'+from:from+'-'+to)
	    // +'-'+new
	    // Date().format("yyyyMMdd");
	    return filename;
	},

	read_handler : function(fs) {

	    fs.root.getFile(syl.fs.get_filename(), {}, function(fileEntry) {

		fileEntry.file(function(file) {
		    var reader = new FileReader();

		    reader.onloadend = function(e) {
			// content = this.result;
			// TODO:read the content assign to the argument
			// "content";
			var records = this.result.split('\n');
			var lastestrecords = records.lenght > 10 ? records
				.slice(records.length - 10, records.length)
				: records.slice(0, records.length);
			syl.fs.__records = [];
			for (var i = 0; i < lastestrecords.length; i++) {
			    var r = lastestrecords[i].split(' ');
			    syl.fs.__records.push(syl.fs.Record(r[0], r[1],
				    r[2], r[3]));
			}

			reader.readAsText(file);
		    }
		}, this.error_handler);

	    }, this.error_handler);

	},

	write_handler : function(fs) {
	    fs.root.getFile(syl.fs.get_filename(), {
		create : true
	    }, function(fileEntry) {

		fileEntry.createWriter(function(fileWriter) {
		    fileWriter.onwriteend = function(e) {
			syl.fs.__records = [];
			console.log('Write completed.');
		    };
		    fileWriter.onerror = function(e) {
			console.log('Write failed: ' + e.toString());
		    };
		    // Create a new Blob and write it to log.txt.
		    // var bb = window.BlobBuilder || window.WebKitBlobBuilder;
		    // bb.append('Lorem Ipsum');
		    // fileWriter.write(bb.getBlob('text/plain'));
		    var records = syl.fs.__records;
		    var msg = '';
		    for (var i = 0; i < records.length; i++) {
			var record = records[i];
			msg += record.from + ' ' + record.to + ' '
				+ record.time + ' ' + record.content + '\n';
		    }
		    fileWriter.seek(fileWriter.length);
		    var blob = new Blob([ msg ], {
			type : 'text/plain'
		    });
		    fileWriter.write(blob);

		}, this.error_handler);

	    }, this.error_handler);
	},

	error_handler : function(e) {
	    console.log(e.name + ': ' + e.message);
	}

    }
});