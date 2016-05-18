$(function() {
    $("#chat_textarea").bind("keydown", function(event) {
	if (event.keyCode === $.ui.keyCode.TAB) {
	    event.preventDefault();
	}
	if (event.keyCode === 27) {
	    $(this).blur();
	    window.getSelection().removeAllRanges();
	    var parents = syl.wnd.activeele.parents();
	    for (var i = 0; i < parents.length; i++) {
		if ($(parents[i]).attr('tabIndex')) {
		    $(parents[i]).focus();
		    break;
		}
	    }

	}
    }).autocomplete({
	minLength : 1,
	delay : 10,
	autoFocus : true,

	source : function(request, response) {
	    var term = request.term, results = [];
	    if (term.indexOf("@") === 0 && term.split("@").length == 2) {
		var userList = JSON.parse(localStorage.getItem('userlist'));
		var users = [];

		$.each(userList, function(i, n) {
		    var username = n.username;
		    if (n.ids) {
			username += '(' + n.userids + ')';
		    }
		    users.push({
			'label' : username,
			'id' : n.id
		    });
		});

		if (term.lenght == 1) {
		    results = users;
		} else {
		    var filterUsers = [];
		    var matcher = single_match(term.substr(1, term.length));
		    var re = new RegExp(matcher);
		    $.each(users, function(i, n) {
			if (n.label.match(re)) {
			    filterUsers.push(n);
			}
		    });
		    results = filterUsers;
		}

	    } else {
		results = [];
	    }
	    response(results);
	},
	position : {
	    my : 'left top',
	    at : 'left+20px top+20px'
	},
	open : function() {
	    $('.ui-autocomplete').css('width', '200px');
	},
	focus : function(event, ui) {
	    return false;
	},
	select : function(event, ui) {
	    $(this).html('@' + ui.item.label + ':');
	    syl.touserid = ui.item.id;
	    if (event.keyCode === 13) {
		var range = document.createRange();
		var sel = window.getSelection();
		var nodes = this.childNodes;
		range.setStart(this.childNodes[0], this.childNodes[0].length);
		sel.removeAllRanges();
		sel.addRange(range);
	    }
	    return false;
	}
    }).autocomplete("instance")._renderItem = function(ul, item) {
	var tip = $("<span>").html(item.value).css("color", "#B8B8B8");
	var tip_html = $("<div>").append(tip).html();
	var content = "<a>" + item.label + "</a>";
	return $("<li>").append(content).appendTo(ul);
    };
});