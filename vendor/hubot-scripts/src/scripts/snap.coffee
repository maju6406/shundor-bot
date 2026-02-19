
# Description:
#   snap
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot snap - sinbraaaad!
#
# Author:
#   maju6406

snap = [
  "https://media.giphy.com/media/bQ8ZoNK1NqaQw/giphy.gif"
]

module.exports = (robot) ->
  robot.hear /snap/i, (msg) ->
    msg.send msg.random snap
