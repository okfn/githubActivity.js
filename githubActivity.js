(function() {
  var $, GITHUB, GITHUB_ACTIONS, GITHUB_API, GithubActivity, PFX, eventHelpers, getRepoEventsData, makeLastManInCheck, util;
  if (!(typeof jQuery !== "undefined" && jQuery !== null)) {
    console.warn("GithubActivity requires jQuery!");
  }
  if (!(typeof _ !== "undefined" && _ !== null)) {
    console.warn("GithubActivity requires Underscore.js!");
  }
  $ = jQuery;
  PFX = "githubActivity";
  GITHUB = 'https://github.com';
  GITHUB_API = 'https://api.github.com';
  GITHUB_ACTIONS = {
    IssuesEvent: 'an issue',
    WatchEvent: 'watching a repo'
  };
  getRepoEventsData = function(repo, cb) {
    if (cb == null) {
      cb = (function() {});
    }
    return $.getJSON("" + GITHUB_API + "/repos/" + repo + "/events", null, cb);
  };
  makeLastManInCheck = function(gaObj, repo, kind) {
    var lmic;
    lmic = function(data, textStatus, jqXHR) {
      gaObj.registerData(repo, kind, data);
      if (gaObj.ready()) {
        return gaObj.go();
      }
    };
    return lmic;
  };
  util = {
    truncate: function(s, l) {
      var o;
      if (l == null) {
        l = 50;
      }
      o = s.slice(0, l);
      if (s.length > l) {
        o += "&hellip;";
      }
      return o;
    }
  };
  eventHelpers = {
    who: function(ev) {
      return "<img src='http://www.gravatar.com/avatar/" + ev.actor.gravatar_id + "?s=20'>\n<a href='" + GITHUB + "/" + ev.actor.login + "'>" + ev.actor.login + "</a>";
    },
    repoUrl: function(ev) {
      return "" + GITHUB + "/" + ev.repo.name;
    },
    repo: function(ev) {
      return "<a href='" + (eventHelpers.repoUrl(ev)) + "'>" + ev.repo.name + "</a>";
    },
    titleForDefault: function(ev) {
      return "did something";
    },
    titleForIssuesEvent: function(ev) {
      return "" + ev.payload.action + " an issue on " + (eventHelpers.repo(ev));
    },
    titleForWatchEvent: function(ev) {
      return "" + ev.payload.action + " watching " + (eventHelpers.repo(ev));
    },
    titleForForkEvent: function(ev) {
      return "forked " + (eventHelpers.repo(ev));
    },
    titleForPushEvent: function(ev) {
      var branch;
      branch = ev.payload.ref.split('/')[2];
      if (branch) {
        return "pushed to <strong>" + branch + "</strong> on " + (eventHelpers.repo(ev));
      } else {
        return "pushed to " + (eventHelpers.repo(ev));
      }
    },
    titleForIssueCommentEvent: function(ev) {
      return "commented on \n<a href='" + ev.payload.issue.html_url + "\#issuecomment-" + ev.payload.comment.id + "'>\n  issue " + ev.payload.issue.number + "</a>\non " + (eventHelpers.repo(ev));
    },
    title: function(ev) {
      var t;
      t = eventHelpers["titleFor" + ev.type] || eventHelpers.titleForDefault;
      return "" + (eventHelpers.who(ev)) + " " + (t(ev));
    },
    detailsForDefault: function(ev) {
      return "More " + ev.type + " details here &hellip;";
    },
    detailsForForkEvent: function(ev) {
      return "&rarr; <a href='" + ev.payload.forkee.html_url + "'>" + ev.payload.forkee.html_url + "</a>";
    },
    detailsForPushEvent: function(ev) {
      var c, maxCommits, o, _i, _len, _ref;
      maxCommits = 3;
      o = [];
      _ref = ev.payload.commits.slice(0, maxCommits);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        o.push("<a href='" + c.url + "'>" + c.sha.slice(0, 7) + "</a>: " + (util.truncate(c.message)));
      }
      if (ev.payload.commits.length > maxCommits) {
        o.push("and " + (ev.payload.commits.length - maxCommits) + " more&hellip;");
      }
      return o.join("<br>");
    },
    detailsForIssuesEvent: function(ev) {
      return "<a href='" + ev.payload.issue.url + "'>Issue " + ev.payload.issue.number + "</a>: \n" + (util.truncate(ev.payload.issue.title));
    },
    detailsForIssueCommentEvent: function(ev) {
      return util.truncate(ev.payload.comment.body);
    },
    details: function(ev) {
      var d;
      d = eventHelpers["detailsFor" + ev.type] || eventHelpers.detailsForDefault;
      return "" + (d(ev));
    },
    render: function(ev) {
      return "<div class='event'>\n  <p class='title'>" + (eventHelpers.title(ev)) + "</p>\n  <p class='details'>" + (eventHelpers.details(ev)) + "</p>\n</div>";
    }
  };
  GithubActivity = (function() {
    function GithubActivity(element, repos) {
      var r, _i, _len, _ref;
      this.element = element;
      this.repos = repos;
      this.data = {
        repoEvents: {}
      };
      $(this.element).addClass('github-activity').addClass('loading');
      _ref = this.repos;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        r = _ref[_i];
        getRepoEventsData(r, makeLastManInCheck(this, r, 'repoEvents'));
      }
    }
    GithubActivity.prototype.registerData = function(repo, kind, data) {
      return this.data[kind][repo] = data;
    };
    GithubActivity.prototype.ready = function() {
      var exp, got, k, v;
      got = ((function() {
        var _ref, _results;
        _ref = this.data['repoEvents'];
        _results = [];
        for (k in _ref) {
          v = _ref[k];
          _results.push(k);
        }
        return _results;
      }).call(this)).sort();
      exp = this.repos.sort();
      if (got > exp || exp > got) {
        return false;
      }
      return true;
    };
    GithubActivity.prototype.go = function() {
      var r, _i, _len, _ref;
      this.allEvents = [];
      _ref = this.repos;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        r = _ref[_i];
        this.allEvents = this.allEvents.concat(this.data.repoEvents[r]);
      }
      this.allEvents = _.sortBy(this.allEvents, function(e) {
        return e.created_at;
      }).reverse();
      $(this.element).removeClass('loading');
      return this.drawEvents(this.allEvents.slice(0, 10));
    };
    GithubActivity.prototype.drawEvents = function(events) {
      var e, _i, _len, _results;
      console.log(events);
      _results = [];
      for (_i = 0, _len = events.length; _i < _len; _i++) {
        e = events[_i];
        _results.push($(eventHelpers.render(e)).appendTo(this.element));
      }
      return _results;
    };
    return GithubActivity;
  })();
  jQuery.fn.githubActivity = function(options) {
    if (!options['repos']) {
      console.error("GithubActivity plugin needs 'repos' key!");
      return this;
    }
    new GithubActivity(this, options['repos']);
    return this;
  };
}).call(this);
