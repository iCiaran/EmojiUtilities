import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import axios from 'axios';
import { exec } from 'child_process';
import { sendErrorFeedback } from '../helpers/utilities.js';
import converter from 'discord-emoji-converter';
import imageType from 'image-type';
import sharp from 'sharp';
import isAnimated from 'is-animated';

const uploadSticker = async (interaction, input, name, tag) => {
  return interaction.guild.stickers
    .create({ file: input, name: name, tags: tag })
    .then(async (sticker) => {
      await interaction.editReply({
        content: `Created new sticker with name **${sticker.name}**!`,
      });
    })
    .catch(async (error) => {
      switch (error.message) {
        case 'Maximum number of stickers reached (0)':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'No sticker slots available in server.')],
          });
          break;
        case 'Maximum number of stickers reached (5)':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'No sticker slots available in server.')],
          });
          break;
        case 'Maximum number of stickers reached (15)':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'No sticker slots available in server.')],
          });
          break;
        case 'Maximum number of stickers reached (60)':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'No sticker slots available in server.')],
          });
          break;
        case 'Missing Permissions':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(interaction.commandName, 'Bot is missing `Manage Emojis And Stickers` permission.'),
            ],
          });
          break;
        case 'Asset exceeds maximum size: 33554432':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Unable to upload sticker to server. Output image is too large to upload to server. Try again with a more optimized gif.',
              ),
            ],
          });
          break;
        case 'Invalid Form Body\nname: Must be between 2 and 30 in length.':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Unable to upload sticker.\n`name` must be between 2 and 30 characters in length.',
              ),
            ],
          });
          break;
        case 'Invalid Form Body\nname[BASE_TYPE_BAD_LENGTH]: Must be between 2 and 30 in length.':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Unable to upload sticker.\n`name` must be between 2 and 30 characters in length.',
              ),
            ],
          });
          break;
        case 'Sticker animation duration exceeds maximum of 5 seconds':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Unable to upload sticker.\nLength of gif exceeds maximum duration of 5 seconds.',
              ),
            ],
          });
          break;
        case 'Invalid Asset':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Invalid asset. Please try again with a valid png or animated png.',
              ),
            ],
          });
          break;
        default:
          console.error(
            `**Command:**\n${interaction.commandName}\n**Error Message:**\n${error.message
            }\n**Raw Input:**\n${interaction.options.getString('url')}\n${interaction.options.getString(
              'name',
            )}\n${interaction.options.getString('tag')}`,
          );
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName)],
          });
      }
    });
};

export default {
  data: new SlashCommandBuilder()
    .setName('stickerfy')
    .setDescription('Convert a given image url into a sticker and adds it to server (Supports jpg, png, gif, webp).')
    .addStringOption((option) =>
      option.setName('url').setDescription('The url of the image to turn into a sticker.').setRequired(true),
    )
    .addStringOption((option) => option.setName('name').setDescription('The name for the sticker.').setRequired(true))
    .addStringOption((option) =>
      option.setName('tag').setDescription('The Discord unicode emoji to represent the sticker.').setRequired(true),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        return interaction.editReply({
          content: 'You do not have enough permissions to use this command.\nRequires **Manage Emojis**.',
          ephemeral: true,
        });
      }

      const url = interaction.options.getString('url');
      const name = interaction.options.getString('name');
      let tag = interaction.options.getString('tag');

      const dir = './temps';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      // Convert unicode emoji to discord string name
      tag = converter.getShortcode(tag, false);

      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'utf-8');
      const filename = Math.random().toString(36).substring(2, 10);
      const path = `${dir}/${filename}`;
      const type = await imageType(buffer);

      // Checks if url is an image and sets temp file path if image needs processing
      if (!type) {
        return interaction.editReply({
          content: 'Invalid image type. Command only supports .gif, .png, or .jpg',
        });
      }

      // Checks if url is animated or not; if animated treat as gif, if not treat as png
      if (isAnimated(buffer)) {
        if (type.ext === 'png') {
          await uploadSticker(interaction, buffer, name, tag);
        }
        else {
          await sharp(buffer, { animated: true })
            .resize(320, 320, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .gif({ colours: 32, dither: 0.0 })
            .toFile(`${path}.gif`);
          exec(`./src/helpers/gif2apng ${path}.gif`, async (execError, stdout, stderr) => {
            if (execError) throw execError;
            if (stderr) console.error(`gif2apng stderr ${stderr}`);

            await uploadSticker(interaction, `${path}.png`, name, tag).finally(() => {
              fs.unlink(`${path}.gif`, (err) => {
                if (err) console.error(`Unable to delete image: ${err}`);
              });
              fs.unlink(`${path}.png`, (err) => {
                if (err) console.error(`Unable to delete image: ${err}`);
              });
            });
          });
        }
      }
      else {
        await sharp(buffer)
          .resize(320, 320, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(`${path}.png`);

        await uploadSticker(interaction, `${path}.png`, name, tag).finally(() => {
          fs.unlink(`${path}.png`, (err) => {
            if (err) {
              console.error(`Unable to delete image: ${err}`);
            }
          });
        });
      }
    }
    catch (error) {
      switch (error.message) {
        case 'Emoji doesn\'t exist':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Invalid value in `tag`.\nExpected default discord emoji, e.g. 🍌',
              ),
            ],
          });
          break;
        case 'connect ECONNREFUSED 127.0.0.1:80':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'Invalid url in `url`.')],
          });
          break;
        case 'connect ECONNREFUSED ::1:80':
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName, 'Invalid url in `url`.')],
          });
          break;
        case 'Cannot read properties of null (reading \'ext\')':
          await interaction.editReply({
            embeds: [
              sendErrorFeedback(
                interaction.commandName,
                'Invalid url in `url`.\nCan\'t detect image type. Try again with a direct link to the image.',
              ),
            ],
          });
          break;
        default:
          console.error(
            `**Command:**\n${interaction.commandName}\n**Error Message:**\n${error.message
            }\n**Raw Input:**\n${interaction.options.getString('url')}\n${interaction.options.getString(
              'name',
            )}\n${interaction.options.getString('tag')}`,
          );
          await interaction.editReply({
            embeds: [sendErrorFeedback(interaction.commandName)],
          });
      }
    }
  },
};
