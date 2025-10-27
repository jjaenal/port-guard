import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TokenPerformance } from "./token-performance";
import { formatCurrencyTiny } from "@/lib/utils";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";

// Mock next/image to avoid Next.js specific behaviors in tests
vi.mock("next/image", () => ({
  default: () => {
    return <div data-testid="next-image-stub" />;
  },
}));

describe("TokenPerformance component", () => {
  it("renders empty state when no tokens provided", () => {
    render(<TokenPerformance tokens={[]} />);
    expect(screen.getByText(/No tokens to analyze/i)).toBeInTheDocument();
  });

  it("calculates and displays gains, losses, and net PnL correctly", () => {
    const tokens: TokenHoldingDTO[] = [
      {
        chain: "ethereum",
        contractAddress: "0xeth",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        balance: "1000000000000000000",
        formatted: "1",
        priceUsd: 2000,
        priceChange24h: 5,
        valueUsd: 1000,
        change24h: 5,
      },
      {
        chain: "ethereum",
        contractAddress: "0xmatic",
        symbol: "MATIC",
        name: "Polygon",
        decimals: 18,
        balance: "1000000000000000000",
        formatted: "1",
        priceUsd: 200,
        priceChange24h: -10,
        valueUsd: 200,
        change24h: -10,
      },
      {
        chain: "ethereum",
        contractAddress: "0xusdc",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        balance: "1000000",
        formatted: "1",
        priceUsd: 1,
        priceChange24h: 0.005,
        valueUsd: 100,
        change24h: 0.005,
      },
    ];

    render(<TokenPerformance tokens={tokens} />);

    // Total gains = 5% of $1000 = $50
    const expectedGains = formatCurrencyTiny(50);
    const gainsLabel = screen.getByText(/Total Gains/i);
    const gainsContainer = gainsLabel.closest("div")!;
    expect(within(gainsContainer).getByText(expectedGains)).toBeInTheDocument();

    // Total losses = -10% of $200 = -$20
    const expectedLosses = formatCurrencyTiny(-20);
    const lossesLabel = screen.getByText(/Total Losses/i);
    const lossesContainer = lossesLabel.closest("div")!;
    expect(
      within(lossesContainer).getByText(expectedLosses),
    ).toBeInTheDocument();

    // Net PnL = $50 + (-$20) = $30
    const expectedNet = formatCurrencyTiny(30);
    const netLabel = screen.getByText(/Net P&L/i);
    const netContainer = netLabel.closest("div")!;
    expect(within(netContainer).getByText(expectedNet)).toBeInTheDocument();

    // Tokens tracked shows count of tokens with valueUsd
    expect(screen.getByText("3")).toBeInTheDocument();
    // Summary line should show 1 up, 1 down
    expect(screen.getByText(/1 up, 1 down/i)).toBeInTheDocument();

    // Top gainers includes ETH with +5%
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getAllByText(/\+5(\.00)?%/i)[0]).toBeInTheDocument();

    // Top losers includes MATIC with -10%
    expect(screen.getByText("MATIC")).toBeInTheDocument();
    expect(screen.getAllByText(/-10(\.00)?%/i)[0]).toBeInTheDocument();
  });

  it("renders '<$0.01' for tiny total gains", () => {
    const tokens: TokenHoldingDTO[] = [
      {
        chain: "ethereum",
        contractAddress: "0xmini",
        symbol: "MINI",
        name: "Mini Token",
        decimals: 18,
        balance: "1000000000000000000",
        formatted: "1",
        priceUsd: 1,
        priceChange24h: 0.5,
        valueUsd: 1,
        change24h: 0.5, // 0.5% of $1 => $0.005 (< $0.01)
      },
    ];

    render(<TokenPerformance tokens={tokens} />);

    const gainsLabel = screen.getByText(/Total Gains/i);
    const gainsContainer = gainsLabel.closest("div")!;
    expect(within(gainsContainer).getByText("<$0.01")).toBeInTheDocument();
  });

  it("shows neutral messages when no gainers or losers", () => {
    const tokens: TokenHoldingDTO[] = [
      {
        chain: "ethereum",
        contractAddress: "0xneutral1",
        symbol: "NEU1",
        name: "Neutral One",
        decimals: 18,
        balance: "1000000000000000000",
        formatted: "1",
        priceUsd: 10,
        priceChange24h: 0.005,
        valueUsd: 10,
        change24h: 0.005, // below +0.01 => neutral
      },
      {
        chain: "ethereum",
        contractAddress: "0xneutral2",
        symbol: "NEU2",
        name: "Neutral Two",
        decimals: 18,
        balance: "1000000000000000000",
        formatted: "1",
        priceUsd: 10,
        priceChange24h: -0.005,
        valueUsd: 10,
        change24h: -0.005, // above -0.01 => neutral
      },
    ];

    render(<TokenPerformance tokens={tokens} />);

    expect(
      screen.getByText(/No tokens gained value in the last 24 hours/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No tokens lost value in the last 24 hours/i),
    ).toBeInTheDocument();
  });
});
