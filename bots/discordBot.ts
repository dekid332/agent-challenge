import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } from "discord.js";
import { storage } from "../server/storage";
import { rugMuseumAgent } from "../agents/rugMuseumAgent";

export class DiscordBotService {
  private client: Client | null = null;
  private isInitialized = false;
  private channelIds: Set<string> = new Set();

  async initialize() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const appId = process.env.DISCORD_APPLICATION_ID;
    
    if (!token || !appId) {
      console.warn("💬 Discord bot credentials not provided");
      return;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      await this.setupCommands(token, appId);
      this.setupEventHandlers();
      
      await this.client.login(token);
      this.isInitialized = true;
      console.log("💬 Discord bot initialized successfully");
    } catch (error) {
      console.error("💬 Failed to initialize Discord bot:", error);
    }
  }

  private async setupCommands(token: string, appId: string) {
    const commands = [
      new SlashCommandBuilder()
        .setName("track")
        .setDescription("Track a specific stablecoin")
        .addStringOption(option =>
          option.setName("symbol")
            .setDescription("Stablecoin symbol (e.g., USDC)")
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName("prices")
        .setDescription("Get current stablecoin prices"),
      
      new SlashCommandBuilder()
        .setName("alerts")
        .setDescription("Get recent alerts"),
      
      new SlashCommandBuilder()
        .setName("whales")
        .setDescription("Get recent whale activity"),
      
      new SlashCommandBuilder()
        .setName("digest")
        .setDescription("Get the latest daily digest"),
      
      new SlashCommandBuilder()
        .setName("rug")
        .setDescription("Get info about a rugged coin")
        .addStringOption(option =>
          option.setName("symbol")
            .setDescription("Rugged coin symbol (e.g., UST)")
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName("museum")
        .setDescription("Get rug museum statistics"),
      
      new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Subscribe this channel to live alerts"),
      
      new SlashCommandBuilder()
        .setName("unsubscribe")
        .setDescription("Unsubscribe this channel from alerts"),
    ];

    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationCommands(appId), {
      body: commands.map(cmd => cmd.toJSON()),
    });
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.on("ready", () => {
      console.log(`💬 Discord bot logged in as ${this.client?.user?.tag}`);
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      try {
        switch (commandName) {
          case "track":
            await this.handleTrackCommand(interaction);
            break;
          case "prices":
            await this.handlePricesCommand(interaction);
            break;
          case "alerts":
            await this.handleAlertsCommand(interaction);
            break;
          case "whales":
            await this.handleWhalesCommand(interaction);
            break;
          case "digest":
            await this.handleDigestCommand(interaction);
            break;
          case "rug":
            await this.handleRugCommand(interaction);
            break;
          case "museum":
            await this.handleMuseumCommand(interaction);
            break;
          case "subscribe":
            await this.handleSubscribeCommand(interaction);
            break;
          case "unsubscribe":
            await this.handleUnsubscribeCommand(interaction);
            break;
        }
      } catch (error) {
        console.error("💬 Discord command error:", error);
        await interaction.reply({ content: "🐸 Oops! Something went wrong.", ephemeral: true });
      }
    });
  }

  private async handleTrackCommand(interaction: any) {
    const symbol = interaction.options.getString("symbol").toUpperCase();
    
    const coin = await storage.getStablecoinBySymbol(symbol);
    if (!coin) {
      await interaction.reply({ content: `🐸 Sorry, I don't track ${symbol} yet.`, ephemeral: true });
      return;
    }

    const price = parseFloat(coin.currentPrice || "1.0");
    const change = parseFloat(coin.priceChange24h || "0");
    const status = coin.pegStatus;

    const embed = new EmbedBuilder()
      .setTitle(`${coin.name} (${symbol})`)
      .setColor(this.getStatusColor(status))
      .addFields(
        { name: "💰 Price", value: `$${price.toFixed(4)}`, inline: true },
        { name: "📈 24h Change", value: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, inline: true },
        { name: "🎯 Peg Status", value: status, inline: true },
      )
      .setFooter({ text: this.getPeggQuote(status, symbol) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handlePricesCommand(interaction: any) {
    const coins = await storage.getStablecoins();
    
    if (coins.length === 0) {
      await interaction.reply({ content: "🐸 No stablecoins being tracked yet!", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("💰 Current Stablecoin Prices")
      .setColor(0x00ff88)
      .setTimestamp();

    for (const coin of coins.slice(0, 10)) {
      const price = parseFloat(coin.currentPrice || "1.0");
      const change = parseFloat(coin.priceChange24h || "0");
      const emoji = this.getStatusEmoji(coin.pegStatus);
      
      embed.addFields({
        name: `${emoji} ${coin.symbol}`,
        value: `$${price.toFixed(4)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`,
        inline: true,
      });
    }

    embed.setFooter({ text: "🐸 Stay vigilant, stay stable!" });
    await interaction.reply({ embeds: [embed] });
  }

  private async handleAlertsCommand(interaction: any) {
    const alerts = await storage.getAlerts(5);
    
    if (alerts.length === 0) {
      await interaction.reply({ content: "🐸 No recent alerts. All is peaceful!", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🚨 Recent Alerts")
      .setColor(0xff6b6b)
      .setTimestamp();

    for (const alert of alerts) {
      const emoji = this.getAlertEmoji(alert.type, alert.severity);
      const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Unknown';
      
      embed.addFields({
        name: `${emoji} ${alert.type}`,
        value: `${alert.message}\n🕒 ${time}`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  }

  private async handleWhalesCommand(interaction: any) {
    const transactions = await storage.getWhaleTransactions(5);
    
    if (transactions.length === 0) {
      await interaction.reply({ content: "🐸 No recent whale activity. The whales are sleeping!", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🐋 Recent Whale Activity")
      .setColor(0x4ecdc4)
      .setTimestamp();

    for (const tx of transactions) {
      const amount = this.formatAmount(parseFloat(tx.amount || "0"));
      const time = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown';
      
      embed.addFields({
        name: `${tx.direction === "IN" ? "📈" : "📉"} ${tx.token} ${tx.direction}`,
        value: `${amount} ${tx.token}\n🕒 ${time}`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  }

  private async handleDigestCommand(interaction: any) {
    const digest = await storage.getLatestDigest();
    
    if (!digest) {
      await interaction.reply({ content: "🐸 No digest available yet. Check back later!", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📊 Daily Digest")
      .setDescription(digest.summary)
      .setColor(0x00ff88)
      .addFields(
        { name: "🥇 Best Performer", value: digest.bestPerformer || "N/A", inline: true },
        { name: "🥉 Worst Performer", value: digest.worstPerformer || "N/A", inline: true },
        { name: "🚨 Alerts", value: digest.alertCount?.toString() || "0", inline: true },
        { name: "🐋 Whale Activity", value: digest.whaleActivityCount?.toString() || "0", inline: true },
      )
      .setFooter({ text: digest.memeQuote || "🐸 'Pegg's daily wisdom'" })
      .setTimestamp(new Date(digest.date));

    await interaction.reply({ embeds: [embed] });
  }

  private async handleRugCommand(interaction: any) {
    const symbol = interaction.options.getString("symbol").toUpperCase();
    
    const rug = await rugMuseumAgent.getRuggedCoinBySymbol(symbol);
    if (!rug) {
      await interaction.reply({ content: `🐸 No rug record found for ${symbol}. Maybe it's still alive?`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🪦 ${rug.name} (${rug.symbol})`)
      .setDescription(rug.story)
      .setColor(0xff4757)
      .addFields(
        { name: "💀 Death Date", value: rug.formattedDeathDate || "Unknown", inline: true },
        { name: "💸 Market Cap Lost", value: rug.formattedMarketCap || "Unknown", inline: true },
        { name: "⚰️ Cause of Death", value: rug.cause, inline: true },
      )
      .setFooter({ text: rug.memeQuote || "🐸 'RIP'" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleMuseumCommand(interaction: any) {
    const stats = await rugMuseumAgent.getRugMuseumStats();
    
    const embed = new EmbedBuilder()
      .setTitle("🪦 Rug Museum Statistics")
      .setColor(0xff4757)
      .addFields(
        { name: "💀 Total Rugs", value: stats.totalRugs.toString(), inline: true },
        { name: "💸 Total Lost", value: stats.formattedTotalLoss, inline: true },
        { name: "📊 Avg Loss", value: this.formatAmount(stats.avgLossPerRug), inline: true },
      )
      .setFooter({ text: "🐸 'Pegg remembers them all...'" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleSubscribeCommand(interaction: any) {
    const channelId = interaction.channelId;
    this.channelIds.add(channelId);
    
    await interaction.reply({ content: "🐸 This channel is now subscribed to live alerts!", ephemeral: true });
  }

  private async handleUnsubscribeCommand(interaction: any) {
    const channelId = interaction.channelId;
    this.channelIds.delete(channelId);
    
    await interaction.reply({ content: "🐸 This channel has been unsubscribed from alerts.", ephemeral: true });
  }

  async sendAlert(alert: any) {
    if (!this.client || this.channelIds.size === 0) return;

    const embed = new EmbedBuilder()
      .setTitle(`${this.getAlertEmoji(alert.type, alert.severity)} ${alert.type} Alert`)
      .setDescription(alert.message)
      .setColor(this.getAlertColor(alert.severity))
      .setFooter({ text: alert.metadata?.memeQuote || "🐸 'Pegg is watching...'" })
      .setTimestamp();

    for (const channelId of this.channelIds) {
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error(`💬 Failed to send alert to channel ${channelId}:`, error);
        this.channelIds.delete(channelId);
      }
    }
  }

  async sendDigest(digest: any) {
    if (!this.client || this.channelIds.size === 0) return;

    const embed = new EmbedBuilder()
      .setTitle("📊 Daily Digest")
      .setDescription(digest.summary)
      .setColor(0x00ff88)
      .addFields(
        { name: "🥇 Best", value: digest.bestPerformer || "N/A", inline: true },
        { name: "🥉 Worst", value: digest.worstPerformer || "N/A", inline: true },
        { name: "🚨 Alerts", value: digest.alertCount?.toString() || "0", inline: true },
      )
      .setFooter({ text: digest.memeQuote || "🐸 'Pegg's daily wisdom'" })
      .setTimestamp(new Date(digest.date));

    for (const channelId of this.channelIds) {
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error(`💬 Failed to send digest to channel ${channelId}:`, error);
        this.channelIds.delete(channelId);
      }
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case "STABLE": return "✅";
      case "ALERT": return "⚠️";
      case "DEPEGGED": return "🚨";
      default: return "🔍";
    }
  }

  private getAlertEmoji(type: string, severity: string): string {
    if (severity === "CRITICAL") return "🚨";
    if (type === "DEPEG") return "⚠️";
    if (type === "WHALE") return "🐋";
    return "ℹ️";
  }

  private getStatusColor(status: string): number {
    switch (status) {
      case "STABLE": return 0x00ff88;
      case "ALERT": return 0xffa500;
      case "DEPEGGED": return 0xff4757;
      default: return 0x747d8c;
    }
  }

  private getAlertColor(severity: string): number {
    switch (severity) {
      case "CRITICAL": return 0xff4757;
      case "HIGH": return 0xffa500;
      case "MEDIUM": return 0xf1c40f;
      case "LOW": return 0x00ff88;
      default: return 0x747d8c;
    }
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(2)}`;
  }

  private getPeggQuote(status: string, symbol: string): string {
    const quotes = {
      STABLE: `🐸 "${symbol} is as stable as Pegg's lily pad!"`,
      ALERT: `🐸 "Pegg is keeping a close eye on ${symbol}..."`,
      DEPEGGED: `🐸 "PEGG PANIC MODE ACTIVATED FOR ${symbol}!"`,
    };

    return quotes[status as keyof typeof quotes] || quotes.STABLE;
  }

  getStatus() {
    return {
      name: "Discord Bot",
      isInitialized: this.isInitialized,
      subscribedChannels: this.channelIds.size,
    };
  }
}

export const discordBot = new DiscordBotService();
