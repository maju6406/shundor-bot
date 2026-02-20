import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { env } from '../lib/env.js';

type GiphyResult = {
  id: string;
  url: string;
  title: string;
  images: {
    original: {
      url: string;
    };
  };
};

const gf = new GiphyFetch(env.GIPHY_API_KEY ?? '');

function pickRandomIndex(length: number, exclude?: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (exclude !== undefined && next === exclude) next = Math.floor(Math.random() * length);
  return next;
}

async function searchGiphy(query: string): Promise<GiphyResult[]> {
  const result = await gf.search(query, {
    limit: 25,
    rating: 'pg-13',
    lang: 'en'
  });
  return result.data.map((gif) => ({
    id: String(gif.id),
    url: gif.url,
    title: gif.title,
    images: {
      original: {
        url: gif.images.original.url
      }
    }
  }));
}

function buildRow(idSeed: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`giphy:send:${idSeed}`).setLabel('Send').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`giphy:shuffle:${idSeed}`).setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`giphy:cancel:${idSeed}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
  );
}

function previewContent(query: string, gif: GiphyResult): string {
  return `**/giphy ${query}**\n${gif.images.original.url}`;
}

export class GiphyCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('giphy')
        .setDescription('Search Giphy and choose a result')
        .addStringOption((option) =>
          option.setName('text').setDescription('Search text').setRequired(true).setMaxLength(200)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!env.GIPHY_API_KEY?.trim()) {
      return interaction.reply({
        ephemeral: true,
        content: 'Giphy is not configured. Set `GIPHY_API_KEY` in environment settings.'
      });
    }

    const text = interaction.options.getString('text', true).trim();
    await interaction.deferReply({ ephemeral: true });

    let results: GiphyResult[];
    try {
      results = await searchGiphy(text);
    } catch (error) {
      this.container.logger.error({ err: error }, 'Giphy request failed');
      return interaction.editReply('Giphy request failed. Please try again in a moment.');
    }

    if (!results.length) {
      return interaction.editReply(`No GIFs found for: \`${text}\``);
    }

    let currentIndex = pickRandomIndex(results.length);
    const idSeed = interaction.id;
    const content = previewContent(text, results[currentIndex]);
    await interaction.editReply({
      content,
      components: [buildRow(idSeed)]
    });

    const reply = await interaction.fetchReply();

    while (true) {
      let component;
      try {
        component = await reply.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 60_000,
          filter: (i) => i.user.id === interaction.user.id && i.customId.endsWith(`:${idSeed}`)
        });
      } catch {
        await interaction.editReply({
          content: `${previewContent(text, results[currentIndex])}\n\n_Selection timed out._`,
          components: []
        });
        return;
      }

      if (component.customId.startsWith('giphy:shuffle:')) {
        currentIndex = pickRandomIndex(results.length, currentIndex);
        await component.update({
          content: previewContent(text, results[currentIndex]),
          components: [buildRow(idSeed)]
        });
        continue;
      }

      if (component.customId.startsWith('giphy:send:')) {
        const selected = results[currentIndex];
        await interaction.followUp({ content: selected.images.original.url });
        await component.update({
          content: `${previewContent(text, selected)}\n\n_Sent._`,
          components: []
        });
        return;
      }

      await component.update({
        content: `${previewContent(text, results[currentIndex])}\n\n_Cancelled._`,
        components: []
      });
      return;
    }
  }
}
