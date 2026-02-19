
# Description:
#   twirl
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot twirl - sinbraaaad!
#
# Author:
#   maju6406

twirl = [
  "https://media.giphy.com/media/6TEo67Fh1CRQk/giphy.gif"
]

module.exports = (robot) ->
  robot.hear /twirl/i, (msg) ->
    msg.send msg.random twirl
