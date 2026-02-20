import type { Trigger } from '../types.js';
import { safeReply } from '../router.js';
import {
  POINTS_COOLDOWN_SECONDS,
  awardPointsBulk,
  getCooldownRemainingSeconds,
  logPointsAwardEvent,
  pickAwardGif,
  setCooldown
} from '../../lib/points/service.js';
import { specialPointsTotalMessage } from '../../lib/points/milestones.js';

function pickRandom(items: readonly string[]): string {
  if (!items.length) return '';
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

const clutches = ['https://media.giphy.com/media/qE7OssOtzKvAI/giphy.gif'];
const hotDamn = ['https://i.giphy.com/80KYXCRVLo1ji.gif'];
const kanyeClap = ['http://i.imgur.com/JOMnW9a.gif'];
const micDrop = [
  'http://37.media.tumblr.com/c0935a4ed5f1dc03d2ce7b7dd841f8b9/tumblr_n3f2c0AGWF1so18vqo1_500.gif',
  'http://media.tumblr.com/8b8cb315e7890bc15893c96bcf6483dc/tumblr_inline_mrm6umYJJJ1qz4rgp.gif',
  'https://media.giphy.com/media/qlwnHTKCPeak0/giphy.gif',
  'https://media.giphy.com/media/R3FSRO8Z9D0lO/giphy.gif',
  'http://stream1.gifsoup.com/view8/20131226/4935715/chappelle-mic-drop-o.gif',
  'https://media.giphy.com/media/um7PuMhNZEuR2/giphy.gif',
  'https://media.giphy.com/media/rq47PJe34Dj4k/giphy.gif',
  'https://media.giphy.com/media/IOCXHPvn3WErm/giphy.gif',
  'https://media.giphy.com/media/13py6c5BSnBkic/giphy.gif',
  'http://i.giphy.com/qqDoi59GPpwn6.gif',
  'http://i.giphy.com/JC4bOOAonTE6Q.gif',
  'http://i.giphy.com/xT9DPhONuz1SpCONiM.gif',
  'http://i.giphy.com/xTiTnI4bir5NeN5z6o.gif',
  'http://i.giphy.com/Ecl9qquXCZWHm.gif',
  'http://i.giphy.com/qaFduOMYKkmwE.gif',
  'http://i.giphy.com/NLNZ2CPw78YSc.gif',
  'http://i.giphy.com/9bCeeBPzpbf2M.gif'
];
const snap = ['https://media.giphy.com/media/bQ8ZoNK1NqaQw/giphy.gif'];
const soCute = ['http://imgur.com/hfmyfhl.gif'];
const technology = ['https://i.imgur.com/URV9Ea1.giff'];
const twirl = ['https://media.giphy.com/media/6TEo67Fh1CRQk/giphy.gif'];
const fivethirty = ['https://media.giphy.com/media/QzlAdQIbcM7sY/giphy.gif'];

export const hubotPersonalPhase1Triggers: Trigger[] = [
  {
    id: 'hubot.hear.points-bang',
    kind: 'hear',
    description: 'Saying "points!" gives +1 to other real users in the channel.',
    cooldownSeconds: 0,
    patterns: [/^\s*points!\s*$/i],
    async run(ctx) {
      const { message } = ctx;
      if (!message.inGuild() || !message.guildId || !message.member) return;

      const remaining = await getCooldownRemainingSeconds(message.guildId, message.author.id);
      if (remaining > 0) {
        await safeReply(message, `Points cooldown active (${remaining}s remaining).`);
        return;
      }

      const maybeMembers = (message.channel as { members?: unknown }).members;
      const channelMembers = maybeMembers && typeof maybeMembers === 'object' && 'values' in maybeMembers
        ? [...(maybeMembers as { values: () => Iterable<any> }).values()]
        : [];
      const receiverIds = channelMembers
        .filter((m) => !m.user.bot && m.id !== message.author.id)
        .map((m) => m.id);

      if (!receiverIds.length) {
        await safeReply(message, 'No other real users found in this channel right now.');
        return;
      }

      const awarded = await awardPointsBulk(message.guildId, message.author.id, receiverIds, 1);
      await setCooldown(message.guildId, message.author.id, POINTS_COOLDOWN_SECONDS);
      for (const row of awarded) {
        logPointsAwardEvent({
          guildId: message.guildId,
          giverId: message.author.id,
          receiverId: row.receiverId,
          amount: 1,
          total: row.total,
          source: 'points-bang',
          messageId: message.id
        });
      }

      const mentions = receiverIds.map((id) => `<@${id}>`).join(' ');
      const gif = pickAwardGif();
      const lines = [`+1 point to ${awarded.length} users: ${mentions}`];
      const milestoneLines = awarded
        .map((row) => {
          const special = specialPointsTotalMessage(row.total);
          return special ? `<@${row.receiverId}> ${special}` : null;
        })
        .filter(Boolean) as string[];
      lines.push(...milestoneLines);
      if (gif) lines.push(gif);
      await safeReply(message, lines.join('\n'));
    }
  },
  {
    id: 'hubot.hear.530',
    kind: 'hear',
    description: 'Replies with a 530 gif when someone says "530".',
    cooldownSeconds: 0,
    patterns: [/\b530\b/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(fivethirty));
    }
  },
  {
    id: 'hubot.hear.clutches-pearls',
    kind: 'hear',
    description: 'Clutches pearls gif.',
    cooldownSeconds: 0,
    patterns: [/clutches pearls/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(clutches));
    }
  },
  {
    id: 'hubot.hear.hodor',
    kind: 'hear',
    description: 'Replies HODOR!',
    cooldownSeconds: 0,
    patterns: [/\bhodor\b/i],
    async run(ctx) {
      await safeReply(ctx.message, 'HODOR!');
    }
  },
  {
    id: 'hubot.hear.hot-damn',
    kind: 'hear',
    description: 'Hot damn gif.',
    cooldownSeconds: 0,
    patterns: [/hot damn/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(hotDamn));
    }
  },
  {
    id: 'hubot.hear.kanyeclap',
    kind: 'hear',
    description: 'Kanye clap gif.',
    cooldownSeconds: 0,
    patterns: [/\bkanyeclap\b/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(kanyeClap));
    }
  },
  {
    id: 'hubot.hear.mic-drop',
    kind: 'hear',
    description: 'Random mic drop gif.',
    cooldownSeconds: 0,
    patterns: [/mic drop/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(micDrop));
    }
  },
  {
    id: 'hubot.hear.snap',
    kind: 'hear',
    description: 'Snap gif.',
    cooldownSeconds: 0,
    patterns: [/\bsnap\b/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(snap));
    }
  },
  {
    id: 'hubot.hear.so-cute',
    kind: 'hear',
    description: 'So cute gif.',
    cooldownSeconds: 0,
    patterns: [/so cute/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(soCute));
    }
  },
  {
    id: 'hubot.hear.technology',
    kind: 'hear',
    description: 'Technology gif.',
    cooldownSeconds: 0,
    patterns: [/\btechnology\b/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(technology));
    }
  },
  {
    id: 'hubot.hear.twirl',
    kind: 'hear',
    description: 'Twirl gif.',
    cooldownSeconds: 0,
    patterns: [/\btwirl\b/i],
    async run(ctx) {
      await safeReply(ctx.message, pickRandom(twirl));
    }
  }
];
