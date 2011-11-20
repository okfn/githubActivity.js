if not jQuery?
  console.warn("GithubActivity requires jQuery!")

if not _?
  console.warn("GithubActivity requires Underscore.js!")

$ = jQuery

PFX = "githubActivity"

GITHUB = 'https://github.com'
GITHUB_API = 'https://api.github.com'

getRepoEventsData = (repo, cb=(->)) ->
  $.getJSON "#{GITHUB_API}/repos/#{repo}/events?callback=?", null, cb

makeLastManInCheck = (gaObj, repo, kind) ->
  lmic = (data, textStatus, jqXHR) ->
    gaObj.registerData(repo, kind, data.data)

    if gaObj.ready()
      gaObj.go()

  return lmic

util =
  truncate: (s, l=50) ->
    o = s[0...l]
    if s.length > l
      o += "&hellip;"
    o

  humanTime: (date) ->
    now = new Date()
    del = now - date
    secs = del / 1000
    if secs < 5
      return "just now"
    if secs < 60
      return "#{Math.floor(secs)}s ago"
    mins = secs / 60
    if mins < 60
      return "#{Math.floor(mins)}m ago"
    hours = mins / 60
    if hours < 24
      return "#{Math.floor(hours)}h ago"
    days = hours / 24
    return "#{Math.floor(days)}d ago"

  parseISO8601: (string) ->
    # The following code adapted from Paul Sowden's ISO8601 conversion code
    regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
             "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(.([0-9]+))?)?" +
             "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?"

    d = string.match(new RegExp(regexp))
    offset = 0
    date = new Date(d[1], 0, 1)
    date.setMonth d[3] - 1  if d[3]
    date.setDate d[5] if d[5]
    date.setHours d[7] if d[7]
    date.setMinutes d[8] if d[8]
    date.setSeconds d[10] if d[10]
    date.setMilliseconds Number("0." + d[12]) * 1000 if d[12]
    if d[14]
      offset = (Number(d[16]) * 60) + Number(d[17])
      offset *= (if (d[15] is "-") then 1 else -1)
    offset -= date.getTimezoneOffset()
    time = (Number(date) + (offset * 60 * 1000))

    out = new Date()
    out.setTime Number(time)

    return out

eventHelpers =
  who: (ev) ->
    """
    <img src='http://www.gravatar.com/avatar/#{ev.actor.gravatar_id}?s=20'>
    <a href='#{GITHUB}/#{ev.actor.login}'>#{ev.actor.login}</a>
    """

  repoUrl: (ev) ->
    "#{GITHUB}/#{ev.repo.name}"

  repo: (ev) ->
    "<a href='#{eventHelpers.repoUrl(ev)}'>#{ev.repo.name}</a>"

  titleForDefault: (ev) ->
    "did something"

  titleForIssuesEvent: (ev) ->
    "#{ev.payload.action} an issue on #{eventHelpers.repo(ev)}"

  titleForWatchEvent: (ev) ->
    "#{ev.payload.action} watching #{eventHelpers.repo(ev)}"

  titleForForkEvent: (ev) ->
    "forked #{eventHelpers.repo(ev)}"

  titleForPushEvent: (ev) ->
    branch = ev.payload.ref.split('/')[2]
    if branch
      "pushed to <strong>#{branch}</strong> on #{eventHelpers.repo(ev)}"
    else
      "pushed to #{eventHelpers.repo(ev)}"

  titleForIssueCommentEvent: (ev) ->
    """
    commented on
    <a href='#{ev.payload.issue.html_url}\#issuecomment-#{ev.payload.comment.id}'>
      issue #{ev.payload.issue.number}</a>
    on #{eventHelpers.repo(ev)}
    """

  title: (ev) ->
    t = eventHelpers["titleFor#{ev.type}"] or eventHelpers.titleForDefault
    eventWhen = util.humanTime(util.parseISO8601(ev.created_at))
    """
    <span class='when'>#{eventWhen}</span>
    <span class='what'>
      #{eventHelpers.who(ev)}
      #{t(ev)}
    </span>
    """

  detailsForDefault: (ev) ->
    "More #{ev.type} details here &hellip;"

  detailsForForkEvent: (ev) ->
    "&rarr; <a href='#{ev.payload.forkee.html_url}'>#{ev.payload.forkee.html_url}</a>"

  detailsForPushEvent: (ev) ->
    maxCommits = 3
    o = []

    for c in ev.payload.commits[0...maxCommits]
      o.push "<a href='#{eventHelpers.repoUrl(ev)}/commit/#{c.sha}'>#{c.sha[0...7]}</a>: #{util.truncate(c.message)}"

    if ev.payload.commits.length > maxCommits
      o.push "and #{ev.payload.commits.length - maxCommits} more&hellip;"

    o.join("<br>")

  detailsForIssuesEvent: (ev) ->
    """
    <a href='#{ev.payload.issue.html_url}'>Issue #{ev.payload.issue.number}</a>:
    #{util.truncate(ev.payload.issue.title)}
    """

  detailsForIssueCommentEvent: (ev) ->
    util.truncate(ev.payload.comment.body)

  details: (ev) ->
    d = eventHelpers["detailsFor#{ev.type}"] or eventHelpers.detailsForDefault
    "#{d(ev)}"

  render: (ev) ->
    """
    <div class='event'>
      <p class='title'>#{eventHelpers.title(ev)}</p>
      <p class='details'>#{eventHelpers.details(ev)}</p>
    </div>
    """

class GithubActivity
  constructor: (@element, @repos, @options) ->
    @data =
      repoEvents: {}

    $(@element).addClass('github-activity').addClass('loading')

    # Add wrapper
    @wrapper = $("<div class='events-wrapper'></div>").appendTo(@element)[0]

    for r in @repos
      getRepoEventsData(r, makeLastManInCheck(this, r, 'repoEvents'))

  registerData: (repo, kind, data) ->
    @data[kind][repo] = data

  ready: () ->
    got = (k for k, v of @data['repoEvents']).sort()
    exp = @repos.sort()

    if got > exp or exp > got
      return false

    return true

  go: () ->
    @allEvents = []

    for r in @repos
      @allEvents = @allEvents.concat(@data.repoEvents[r])

    @allEvents = _.sortBy(@allEvents, (e) -> e.created_at).reverse()

    $(@element).removeClass('loading')
    this.drawEvents @allEvents[0...(@options.events or 10)]

  drawEvents: (events) ->
    for e in events
      $(eventHelpers.render(e)).appendTo(@wrapper)

jQuery.fn.githubActivity = (options) ->
  if not options['repos']
    console.error "GithubActivity plugin needs 'repos' key!"
    return this

  new GithubActivity(this, options['repos'], options)

  return this
