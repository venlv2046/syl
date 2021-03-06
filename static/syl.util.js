syl = {}
$(function() {
  syl.util = {
    interalrefresh: function() {
      setInterval("syl.util.refresh()", syl.refresh_data);
    },
    userstatus: function() {
      var user = syl.util.get_obj('u');
      var th = this;
      if (user) {
        this.ajax_send({
          i: user.i,
          t: user.t,
          ts: syl.util.get_b('ts'),
          s: user.s
        }, 'cust/userstatus', function(data) {
          th.ajax_main_resp(data, function(data) {
            if (data.l == 1) {
              if (data.u.s == 1) {
                syl.util.set_obj('u', data.u);
                syl.util.refresh(false);
                syl.ws.heart_beat();
                syl.util.interalrefresh();
                syl.tools.init();
              }
              th.update_stat(data.u);
            } else if (data.l == 2) {
              th.update_stat(null);
              th.clear_storage();
            }
          });
        });
      } else {
        this.update_stat(null);
      }
    },
    refresh: function(async) {
      var user = this.get_obj('u');
      var th = this;
      if (user && user.s == 1) {
        this.ajax_send({
          i: user.i,
          ts: syl.util.get_b('ts')
        }, 'cust/refresh', function(data) {
          th.ajax_main_resp(data, function(data) {
            if (data.l == 1) {
              th.set_b('ts', data.ts);
              th.update_userlist(data.ul);
              th.update_grouplist(data.gl);
            }
          });
        }, async);
      }
    },
    ajax_send: function(params, url, fn, async) {
      var th = this;
      var user = syl.util.get_obj('u');
      if (user) params = $.extend(params, {
        i: user.i
      });
      async = async != null ? async : true;
      $.ajax({
        type: 'POST',
        data: params,
        dataType: 'json',
        url: url,
        async: async,
        headers: {
          'X-CSRFToken': th.get_cookie('csrftoken')
        },
        success: function(data) {
          if (fn) {
            fn(data);
          }
        }
      });
    },

    update_userlist: function(nul) {
      // data construct:
      // {userid1:{'i':val,'n':val,'is':val,'ol':val,'gus':{'groupuserid1':{{'gui':val,'m':val,'s':val}...}}...}

      if (nul) {
        var key = 'ul';
        var ul = syl.util.get_obj(key);

        if (ul) {

          for ( var nuid in nul) {
            if (ul[nuid]) {
              var ngus = nul[nuid]['gus'];
              for ( var nguid in ngus) {
                if (ngus[nguid]['s'] == -1) {
                  delete ul[nuid]['gus'][nguid];
                }
                if (ngus[nguid]['s'] == 1) {
                  ul[nuid]['gus'][nguid] = nul[nuid]['gus'][nguid];
                }
              }
            } else {
              ul[nuid] = nul[nuid];
            }
          }
          for ( var ulid in ul) {
            if ($.isEmptyObject(ul[ulid]['gus']) && ul[ulid]['gus']) {
              delete ul[ulid]['gus'];
            }
          }

          syl.util.set_obj(key, ul);
        } else {
          syl.util.set_obj(key, nul);
        }
      }
    },

    update_grouplist: function(ngl) {
      // data construct:
      // {groupid1:{'i':val,'n':val},groupid2:{'i':val,'n':val}...}
      if (ngl) {
        var key = 'gl';
        var gl = syl.util.get_obj(key);
        $.extend(gl, ngl)
        syl.util.set_obj(key, gl);
      }
    },

    get_cookie: function(name) {
      var cookieValue = null;
      if (document.cookie) {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
          var cookie = $.trim(cookies[i]);
          if (cookie.substring(0, name.length + 1) == (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    },

    get_joined_group: function() {
      var userlist = syl.util.get_obj('ul');
      var grouplist = syl.util.get_obj('gl');
      var user = syl.util.get_obj('u');
      var set = new Set();

      for ( var gid in grouplist) {
        if (grouplist[gid]['m'] == user['i']) {
          set.add(gid);
        }
      }

      for ( var uid in userlist) {
        for ( var gid in userlist[uid]['gus']) {
          set.add(gid);
        }
      }
      return set;
    },

    get_obj: function(key) {
      var str = localStorage.getItem(key);
      if (str) { return JSON.parse(str); }
      return {};
    },

    get_b: function(key) {
      var str = localStorage.getItem(key);
      if (str) { return str; }
      return null;
    },
    set_b: function(key, value) {
      localStorage.setItem(key, value);
    },
    get_id: function() {
      return syl.util.get_obj('u')['i'];
    },

    set_obj: function(key, obj) {
      localStorage.setItem(key, JSON.stringify(obj));
    },

    clear_storage: function() {
      localStorage.removeItem('u');
      localStorage.removeItem('ul');
      localStorage.removeItem('gl');
      localStorage.removeItem('ts');
      localStorage.removeItem('aul');
    },

    ajax_resp: function(data) {
      if (data.l == 2) {
        this.showMsg(data.m, data.l);
      } else {
        this.showMsg(data.m, 1);
      }
    },

    ajax_main_resp: function(data, fn) {
      this.ajax_resp(data);
      if (fn) {
        fn(data);
      }
    },
    ajax_mask_resp: function(data, fn) {
      this.ajax_main_resp(data, fn);
      if (data.l == 1) {
        this.mask_empty();
      }
    },

    single_match: function(str) {
      return ".*" + str.split("").join(".*") + ".*";
    },

    update_stat: function(user) {
      if (!user) {
        $('#stat').html('No Signed');
        return;
      }
      $('#stat').html(
              '<span style="color:' + (user.s == 1 ? 'green' : 'red') + '">'
                      + user.n + '</span>');
    },

    keys: function(obj) {
      return $.map(obj, function(element, index) {
        return index
      });
    },
    get_date: function(t, f) {
      var d = new Date();
      d.setTime(t * 1000);
      return d.format(f);
    },
    mask_empty: function() {
      $('#mask').removeClass('dp').addClass('ndp').empty();
    },
    showMsg: function(msg, level) {
      $('#msg').empty();
      if (!level) {
        levle = 1;
      }

      // level--1:info,2:error
      $('#msg').html(msg).css('display', 'block').css('color',
              level === 1 ? 'green' : (level === 2 ? 'red' : ''));

      if (!msg) {
        $('#msg').html('Please press "?" for help.').css('display', 'block')
                .css('color', 'green');
      }

    }
  }

  Date.prototype.format = function(fmt) {
    var o = {
      "M+": this.getMonth() + 1, // 月份
      "d+": this.getDate(), // 日
      "h+": this.getHours(), // 小时
      "m+": this.getMinutes(), // 分
      "s+": this.getSeconds(), // 秒
      "q+": Math.floor((this.getMonth() + 3) / 3), // 季度
      "S": this.getMilliseconds()
    // 毫秒
    };
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "")
              .substr(4 - RegExp.$1.length));
    for ( var k in o)
      if (new RegExp("(" + k + ")").test(fmt))
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k])
                : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
  }
});
