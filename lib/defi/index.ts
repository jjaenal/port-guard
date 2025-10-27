import { stakingRegistry } from "./registry";
import { LidoAdapter } from "./lido";
import { RocketPoolAdapter } from "./rocket-pool";

// Register all staking adapters
stakingRegistry.register(new LidoAdapter());
stakingRegistry.register(new RocketPoolAdapter());

export { stakingRegistry };
export * from "./types";
export * from "./lido";
export * from "./rocket-pool";
