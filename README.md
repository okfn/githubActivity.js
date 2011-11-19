# githubActivity.js

A simple activity monitor for a list of Github repositories.

## Requirements

- [jQuery](http://jquery.com)
- [Underscore.js](http://documentcloud.github.com/underscore/)

## Usage

1. Include jQuery and Underscore.js
2. Include the githubActivity javascript and CSS files:

        <link rel="stylesheet" href="githubActivity.css">
        <script src="githubActivity.js"></script>

3. Create an empty `div` tag for the widget, and initialize it with a list of repositories:

        <div id="github-activity" style="width: 400px"></div>
        <script>
          $('#github-activity').githubActivity({
            repos: ["okfn/dashboard", "okfn/openspending"]
          });
        </script>