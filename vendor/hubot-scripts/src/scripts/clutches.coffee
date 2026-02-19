# Description:
#   clutches
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot kanyeclap - kanye will clap for you!
#
# Author:
#   maju6406

clutches = [
  "https://media.giphy.com/media/qE7OssOtzKvAI/giphy.gif"
]

module.exports = (robot) ->
  robot.hear /clutches pearls/i, (msg) ->
    msg.send msg.random clutches
