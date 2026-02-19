# Description:
#   hot damn
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot hot damn - Don't forget to be awesome!
#
# Author:
#   maju6406

images = [
  "https://i.giphy.com/80KYXCRVLo1ji.gif"
]

module.exports = (robot) ->
  robot.hear /hot damn/i, (msg) ->
    msg.send msg.random images
