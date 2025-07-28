import { JSDOM } from "jsdom";

// Mock the global fetch function
global.fetch = jest.fn();

describe("Userscript API Integration", () => {
  let dom: JSDOM;
  let window: any;
  let document: any;

  beforeEach(() => {
    // Create a new DOM for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="lobby"></div>
          <canvas id="game" style="display: none;"></canvas>
          <div id="leaderboard" style="display: none;">
            <li class="leaderboard-item player" data-player-id="1" data-player-name="Player1" data-player="Player1" data-is-bot="false">
              <span class="player-name">Player1</span>
            </li>
            <li class="leaderboard-item player" data-player-id="2" data-player-name="Bot_AI" data-player="Bot_AI" data-is-bot="true">
              <span class="player-name">Bot_AI</span>
            </li>
          </div>
        </body>
      </html>
    `,
      {
        url: "https://openfront.io",
        pretendToBeVisual: true,
        resources: "usable",
      },
    );

    window = dom.window;
    document = window.document;

    // Set up global references
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom.window.close();
    jest.resetAllMocks();
  });

  test("should detect lobby state correctly", () => {
    // The userscript should be able to detect lobby state from DOM elements
    const lobbyElement = document.querySelector("#lobby");
    const gameElement = document.querySelector("#game");

    expect(lobbyElement).toBeTruthy();
    expect(gameElement).toBeTruthy();
    expect(gameElement.style.display).toBe("none");
  });

  test("should detect player elements for userscript", () => {
    // The userscript should be able to find player elements
    const playerElements = document.querySelectorAll(".player");
    const playerNameElements = document.querySelectorAll(".player-name");

    expect(playerElements).toHaveLength(2);
    expect(playerNameElements).toHaveLength(2);

    // Check first player
    const firstPlayer = playerElements[0];
    expect(firstPlayer.getAttribute("data-player-name")).toBe("Player1");
    expect(firstPlayer.getAttribute("data-is-bot")).toBe("false");

    // Check second player (bot)
    const secondPlayer = playerElements[1];
    expect(secondPlayer.getAttribute("data-player-name")).toBe("Bot_AI");
    expect(secondPlayer.getAttribute("data-is-bot")).toBe("true");
  });

  test("should have leaderboard structure for userscript detection", () => {
    // The userscript looks for leaderboard elements
    const leaderboard = document.querySelector("#leaderboard");
    const leaderboardItems = document.querySelectorAll(".leaderboard-item");

    expect(leaderboard).toBeTruthy();
    expect(leaderboardItems).toHaveLength(2);

    // Verify leaderboard item structure
    const firstItem = leaderboardItems[0];
    expect(firstItem.classList.contains("player")).toBe(true);
    expect(firstItem.getAttribute("data-player-id")).toBe("1");
    expect(firstItem.getAttribute("data-player")).toBe("Player1");
  });

  test("should simulate userscript bot detection logic", () => {
    // Test the bot detection patterns that userscript would use
    const isBot = (playerName: string): boolean => {
      const name = playerName.toLowerCase();

      const botPatterns = [
        "bot",
        "ai",
        "cpu",
        "npc",
        "computer",
        "ai_",
        "_ai",
        "_bot",
        "bot_",
        "system",
      ];

      for (const pattern of botPatterns) {
        if (name.includes(pattern)) {
          return true;
        }
      }

      if (/bot\d+|ai\d+|cpu\d+|npc\d+/.test(name)) {
        return true;
      }

      return false;
    };

    expect(isBot("Player1")).toBe(false);
    expect(isBot("Bot_AI")).toBe(true);
    expect(isBot("AI_Enemy")).toBe(true);
    expect(isBot("Bot1")).toBe(true);
    expect(isBot("HumanPlayer")).toBe(false);
    expect(isBot("cpu_player")).toBe(true);
  });

  test("should mock API responses for player data", async () => {
    // Mock the fetch response for public lobbies
    const mockLobbyData = {
      lobbies: [
        {
          gameID: "test-game-1",
          clients: [
            { clientID: "1", username: "Player1" },
            { clientID: "2", username: "Bot_AI" },
          ],
          numClients: 2,
          gameConfig: { maxPlayers: 8 },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLobbyData),
    });

    // Test that userscript can get player data
    const response = await fetch("/api/public_lobbies");
    const data = await response.json();

    expect(data.lobbies).toHaveLength(1);
    expect(data.lobbies[0].clients).toHaveLength(2);
    expect(data.lobbies[0].clients[0].username).toBe("Player1");
    expect(data.lobbies[0].clients[1].username).toBe("Bot_AI");
  });
});
