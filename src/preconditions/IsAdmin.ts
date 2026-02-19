import { Precondition, type ChatInputCommand } from '@sapphire/framework';
import type { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../lib/env.js';

export class IsAdminPrecondition extends Precondition {
  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    _command: ChatInputCommand,
    _context: Precondition.Context
  ) {
    const ids = (env.ADMIN_ROLE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return this.error({ message: 'ADMIN_ROLE_IDS is not configured.' });

    if (!interaction.inGuild()) return this.error({ message: 'Admin commands must be run in a server.' });

    const member = interaction.member;
    const roles = 'roles' in member ? member.roles : [];
    const has = Array.isArray(roles) ? roles.some((r) => ids.includes(r)) : false;

    return has ? this.ok() : this.error({ message: 'You do not have permission to run this command.' });
  }
}
