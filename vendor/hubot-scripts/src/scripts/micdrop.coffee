# Description:
#   mic drop
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot mic drop - drop the mic!
#
# Author:
#   maju6406

images = [
  "http://37.media.tumblr.com/c0935a4ed5f1dc03d2ce7b7dd841f8b9/tumblr_n3f2c0AGWF1so18vqo1_500.gif",
  "http://media.tumblr.com/8b8cb315e7890bc15893c96bcf6483dc/tumblr_inline_mrm6umYJJJ1qz4rgp.gif",
  "https://media.giphy.com/media/qlwnHTKCPeak0/giphy.gif",
  "https://media.giphy.com/media/R3FSRO8Z9D0lO/giphy.gif",
  "http://stream1.gifsoup.com/view8/20131226/4935715/chappelle-mic-drop-o.gif",
  "https://media.giphy.com/media/um7PuMhNZEuR2/giphy.gif",
  "https://media.giphy.com/media/rq47PJe34Dj4k/giphy.gif",
  "https://media.giphy.com/media/IOCXHPvn3WErm/giphy.gif",
  "https://media.giphy.com/media/13py6c5BSnBkic/giphy.gif",
  "http://i.giphy.com/qqDoi59GPpwn6.gif",
  "http://i.giphy.com/JC4bOOAonTE6Q.gif",
  "http://i.giphy.com/xT9DPhONuz1SpCONiM.gif",
  "http://i.giphy.com/xTiTnI4bir5NeN5z6o.gif",
  "http://i.giphy.com/Ecl9qquXCZWHm.gif",
  "http://i.giphy.com/qaFduOMYKkmwE.gif",
  "http://i.giphy.com/NLNZ2CPw78YSc.gif",
  "http://i.giphy.com/9bCeeBPzpbf2M.gif"
]

module.exports = (robot) ->
  robot.hear /mic drop/i, (msg) ->
    msg.send msg.random images
