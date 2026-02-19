# Description:
#   None
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#
# Author:
#   maju6406

module.exports = (robot) ->
  robot.hear /hodor/i, (msg) ->
    msg.send "HODOR!"
