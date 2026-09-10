export interface DemoUserSeed {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  /** Which races (1-based numbers) the user skipped. */
  skips: number[];
  /** Style influences the lineup generator. */
  style: "consensus" | "contrarian" | "momentum" | "balanced" | "wild";
}

export const DEMO_USERS: DemoUserSeed[] = [
  { id: "usr_demo_01", username: "sectorsam", displayName: "Sector Sam", bio: "Reads rotation before it prints.", skips: [], style: "momentum" },
  { id: "usr_demo_02", username: "nadia.flow", displayName: "Nadia Flow", bio: "Breadth first, price second.", skips: [], style: "balanced" },
  { id: "usr_demo_03", username: "quietwhale", displayName: "Quiet Whale", bio: "Never follows the crowd.", skips: [2], style: "contrarian" },
  { id: "usr_demo_04", username: "rotation_rae", displayName: "Rotation Rae", bio: "Momentum is a story that hasn't ended yet.", skips: [], style: "momentum" },
  { id: "usr_demo_05", username: "kofi.builds", displayName: "Kofi Builds", bio: "Long-term narrative watcher.", skips: [1], style: "consensus" },
  { id: "usr_demo_06", username: "lumen", displayName: "Lumen", bio: "Wildcard hunter.", skips: [], style: "wild" },
  { id: "usr_demo_07", username: "tessa.tao", displayName: "Tessa Tao", bio: "AI narrative specialist.", skips: [], style: "balanced" },
  { id: "usr_demo_08", username: "marcus_v", displayName: "Marcus V", bio: "Crowd reader.", skips: [3], style: "consensus" },
  { id: "usr_demo_09", username: "yuki.sato", displayName: "Yuki Sato", bio: "Early to every rotation.", skips: [], style: "wild" },
  { id: "usr_demo_10", username: "obi_onchain", displayName: "Obi Onchain", bio: "DeFi lifer.", skips: [], style: "contrarian" },
  { id: "usr_demo_11", username: "priya.p", displayName: "Priya P", bio: "Data over vibes.", skips: [1, 2], style: "balanced" },
  { id: "usr_demo_12", username: "hal", displayName: "Hal", bio: "Just here to learn.", skips: [4], style: "consensus" },
  { id: "usr_demo_13", username: "mira.moon", displayName: "Mira Moon", bio: "Memecoin weather forecaster.", skips: [], style: "wild" },
  { id: "usr_demo_14", username: "dev.dan", displayName: "Dev Dan", bio: "Ships and forecasts.", skips: [5], style: "momentum" },
];
