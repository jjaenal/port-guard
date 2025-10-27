import type {
  StakingAdapter,
  StakingPosition,
  StakingProtocolInfo,
  StakingProtocolRegistry,
} from "./types";

/**
 * Registry for staking protocol adapters
 */
class StakingRegistry implements StakingProtocolRegistry {
  private adapters = new Map<string, StakingAdapter>();

  register(adapter: StakingAdapter): void {
    const info = adapter.getProtocolInfo();
    this.adapters.set(info.id, adapter);
  }

  getProtocols(): StakingProtocolInfo[] {
    return Array.from(this.adapters.values()).map((adapter) =>
      adapter.getProtocolInfo(),
    );
  }

  getAdapter(protocolId: string): StakingAdapter | undefined {
    return this.adapters.get(protocolId);
  }

  async getAllPositions(address: string): Promise<StakingPosition[]> {
    const positions: StakingPosition[] = [];

    for (const adapter of this.adapters.values()) {
      try {
        const position = await adapter.getPosition(address);
        if (position && position.balance > 0) {
          positions.push(position);
        }
      } catch (error) {
        console.warn(
          `Failed to fetch position for ${adapter.getProtocolInfo().name}:`,
          error,
        );
      }
    }

    return positions;
  }
}

// Global registry instance
export const stakingRegistry = new StakingRegistry();
