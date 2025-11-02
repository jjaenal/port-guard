import { describe, it, expect } from "vitest";
import { 
  categorizeTransaction, 
  formatTimestamp, 
  detectSwap, 
  detectLPAdd,
  detectLPRemove,
  categorizeTransactionExtended,
  type SwapTransaction 
} from "./transactions";

describe("transactions utils", () => {
  it("categorizes send when address is sender", () => {
    const cat = categorizeTransaction({ from: "0xabc", to: "0xdef" }, "0xAbC");
    expect(cat).toBe("send");
  });

  it("categorizes receive when address is recipient", () => {
    const cat = categorizeTransaction({ from: "0xdef", to: "0xabc" }, "0xAbC");
    expect(cat).toBe("receive");
  });

  it("categorizes unknown when ambiguous", () => {
    const cat = categorizeTransaction({ from: "", to: "" }, "0xAbC");
    expect(cat).toBe("unknown");
  });

  it("formats timestamp to readable string", () => {
    const s = formatTimestamp(1730096400); // arbitrary
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  describe("detectSwap", () => {
    it("detects swap with known Uniswap V2 router", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
        input: "0x7ff36ab5000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0",
      };
      expect(detectSwap(tx)).toBe(true);
    });

    it("detects swap with known function selector", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0x38ed1739", // swapExactTokensForTokens
      };
      expect(detectSwap(tx)).toBe(true);
    });

    it("detects swap with Transfer event pattern", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        logs: [
          {
            address: "0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0b", // Token A
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
          {
            address: "0xB1c86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0c", // Token B
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
        ],
      };
      expect(detectSwap(tx)).toBe(true);
    });

    it("detects swap with multiple heuristics", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 Router
        input: "0x472b43f3", // swapExactInputSingle
        logs: [
          {
            address: "0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0b",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
          {
            address: "0xB1c86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0c",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
        ],
      };
      expect(detectSwap(tx)).toBe(true);
    });

    it("does not detect swap with unknown router and no selector", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x1234567890123456789012345678901234567890", // Unknown address
        input: "0xa9059cbb", // transfer function
      };
      expect(detectSwap(tx)).toBe(false);
    });

    it("does not detect swap with single Transfer event", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x1234567890123456789012345678901234567890",
        logs: [
          {
            address: "0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0b",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
        ],
      };
      expect(detectSwap(tx)).toBe(false);
    });

    it("does not detect swap with same token Transfer events", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x1234567890123456789012345678901234567890",
        logs: [
          {
            address: "0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0b", // Same token
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
          {
            address: "0xA0b86a33E6441e6e80D0c4C34F0b0B2e0c0b0b0b", // Same token
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x000000000000000000000000000000000000000000000000016345785d8a0000",
          },
        ],
      };
      expect(detectSwap(tx)).toBe(false);
    });

    it("handles empty transaction data", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "",
      };
      expect(detectSwap(tx)).toBe(false);
    });

    it("detects SushiSwap router", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f", // SushiSwap Router
        input: "0x18cbafe5", // swapExactTokensForETH
      };
      expect(detectSwap(tx)).toBe(true);
    });

    it("detects 1inch router", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch Router V5
        input: "0x38ed1739", // swapExactTokensForTokens
      };
      expect(detectSwap(tx)).toBe(true); // Known router + valid selector
    });
  });

  describe("categorizeTransactionExtended", () => {
    it("categorizes swap transaction correctly", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
        input: "0x7ff36ab5", // swapExactETHForTokens
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("swap");
    });

    it("falls back to standard categorization for non-swap", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0xrecipient",
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("send");
    });

    it("categorizes receive transaction correctly", () => {
      const tx = {
        hash: "0x123",
        from: "0xsender",
        to: "0xuser",
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("receive");
    });

    it("handles transaction without swap data", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0xrecipient",
        // No input or logs
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("send");
    });
  });

  describe("detectLPAdd", () => {
    it("detects LP add with function selector", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
        input: "0xe8e33700", // addLiquidity selector
        logs: [
          {
            address: "0xpair",
            topics: ["0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"], // Mint event
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(true);
    });

    it("detects LP add with mint event", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xpair",
        logs: [
          {
            address: "0xpair",
            topics: ["0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"], // Mint event
            data: "0x"
          },
          {
            address: "0xtoken1",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"], // Transfer
            data: "0x"
          },
          {
            address: "0xtoken2", 
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"], // Transfer
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(true);
    });

    it("detects LP add with addLiquidityETH", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0xf305d719", // addLiquidityETH
        logs: [
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          },
          {
            address: "0xpair",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(true);
    });

    it("detects Uniswap V3 increaseLiquidity", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 Router
        input: "0x219f5d17", // increaseLiquidity
        logs: [
          {
            address: "0xpool",
            topics: ["0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"], // Mint
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(true);
    });

    it("rejects non-LP transactions", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0x38ed1739", // swapExactTokensForTokens (not LP)
        logs: [
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(false);
    });

    it("rejects transactions without sufficient heuristics", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xrandom",
        input: "0x12345678", // unknown selector
        logs: [
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPAdd(tx)).toBe(false);
    });
  });

  describe("detectLPRemove", () => {
    it("detects LP remove with function selector", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0xbaa2abde", // removeLiquidity
        logs: [
          {
            address: "0xpair",
            topics: ["0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"], // Burn event
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(true);
    });

    it("detects LP remove with burn event", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xpair",
        logs: [
          {
            address: "0xpair",
            topics: ["0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"], // Burn event
            data: "0x"
          },
          {
            address: "0xtoken1",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"], // Transfer
            data: "0x"
          },
          {
            address: "0xtoken2",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"], // Transfer
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(true);
    });

    it("detects removeLiquidityETH", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0x02751cec", // removeLiquidityETH
        logs: [
          {
            address: "0xpair",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          },
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(true);
    });

    it("detects Uniswap V3 decreaseLiquidity", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xe592427a0aece92de3edee1f18e0157c05861564",
        input: "0x0c49ccbe", // decreaseLiquidity
        logs: [
          {
            address: "0xpool",
            topics: ["0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"], // Burn
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(true);
    });

    it("rejects non-LP transactions", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0x38ed1739", // swapExactTokensForTokens
        logs: [
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(false);
    });

    it("rejects transactions without sufficient heuristics", () => {
      const tx: SwapTransaction = {
        hash: "0x123",
        to: "0xrandom",
        input: "0x87654321", // unknown selector
        logs: [
          {
            address: "0xtoken",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      expect(detectLPRemove(tx)).toBe(false);
    });
  });

  describe("categorizeTransactionExtended with LP", () => {
    it("prioritizes LP add over swap detection", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0xe8e33700", // addLiquidity (LP) + could also match swap patterns
        logs: [
          {
            address: "0xpair",
            topics: ["0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"], // Mint
            data: "0x"
          }
        ]
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("lp_add");
    });

    it("prioritizes LP remove over swap detection", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0xbaa2abde", // removeLiquidity
        logs: [
          {
            address: "0xpair",
            topics: ["0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"], // Burn
            data: "0x"
          }
        ]
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("lp_remove");
    });

    it("falls back to swap detection when not LP", () => {
      const tx = {
        hash: "0x123",
        from: "0xuser",
        to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        input: "0x38ed1739", // swapExactTokensForTokens
        logs: [
          {
            address: "0xtoken1",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          },
          {
            address: "0xtoken2",
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            data: "0x"
          }
        ]
      };
      const category = categorizeTransactionExtended(tx, "0xuser");
      expect(category).toBe("swap");
    });
  });
});
