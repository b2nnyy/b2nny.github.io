(function () {
  var PALETTES = [
    { bg: "#f5f1ea", surface: "#e9e1d7", surfaceAlt: "#d7e1e7", accentSoft: "#c8d7df", accent: "#9eb8c7", accentStrong: "#6f8fa2", line: "#d8cec2", muted: "#5f574f", fg: "#101010" },
    { bg: "#f4efe8", surface: "#e8ded1", surfaceAlt: "#dce7e2", accentSoft: "#c4d8d0", accent: "#99bdae", accentStrong: "#6f9d8d", line: "#d5c9bd", muted: "#5d564f", fg: "#101010" },
    { bg: "#f3f0e9", surface: "#e6e0d6", surfaceAlt: "#e3d8e5", accentSoft: "#d7c8df", accent: "#b89fc4", accentStrong: "#8d719b", line: "#d6cec2", muted: "#5b5550", fg: "#101010" },
    { bg: "#f5f0ec", surface: "#e8ddd7", surfaceAlt: "#d8e4ea", accentSoft: "#c6d8e3", accent: "#98b9cd", accentStrong: "#6d91a7", line: "#d8cbc4", muted: "#605752", fg: "#101010" },
    { bg: "#f2f0ec", surface: "#e2ded7", surfaceAlt: "#e7dacd", accentSoft: "#dfc8b6", accent: "#c69b7a", accentStrong: "#9e7558", line: "#d2ccc3", muted: "#5a5650", fg: "#101010" },
    { bg: "#f1f3ee", surface: "#e0e5dc", surfaceAlt: "#eadbd8", accentSoft: "#dfc6c1", accent: "#c9958b", accentStrong: "#a16f66", line: "#cfd8cc", muted: "#525a50", fg: "#101010" },
    { bg: "#f2f4f1", surface: "#dee7e2", surfaceAlt: "#e8ded0", accentSoft: "#dbc7aa", accent: "#bea071", accentStrong: "#937947", line: "#ccd8d1", muted: "#515a55", fg: "#101010" },
    { bg: "#f6f1f2", surface: "#eadfe2", surfaceAlt: "#dce4ec", accentSoft: "#cbd8e8", accent: "#9fb5d2", accentStrong: "#7188a7", line: "#d8cbd0", muted: "#5f5558", fg: "#101010" },
    { bg: "#f2f3f5", surface: "#e0e4e8", surfaceAlt: "#eadfd3", accentSoft: "#dfc9ae", accent: "#c7a171", accentStrong: "#9a794d", line: "#cfd5dc", muted: "#535962", fg: "#101010" },
    { bg: "#f4f2ed", surface: "#e7e0d4", surfaceAlt: "#d9e5dd", accentSoft: "#c8dccf", accent: "#9fbea8", accentStrong: "#728f79", line: "#d5cec2", muted: "#5d574f", fg: "#101010" },

    { bg: "#f8f3ea", surface: "#eadfce", surfaceAlt: "#d8e5ec", accentSoft: "#c3d9e5", accent: "#91b8cf", accentStrong: "#648da8", line: "#d9ccbb", muted: "#61564a", fg: "#101010" },
    { bg: "#f7f0e8", surface: "#eadbd0", surfaceAlt: "#d8e8df", accentSoft: "#c0dbcc", accent: "#91bea2", accentStrong: "#669176", line: "#dac8bc", muted: "#62544c", fg: "#101010" },
    { bg: "#f6f1e7", surface: "#e8ddcb", surfaceAlt: "#e4d8eb", accentSoft: "#d8c4e4", accent: "#b997cb", accentStrong: "#8c6aa0", line: "#d8c9b8", muted: "#5f5549", fg: "#101010" },
    { bg: "#f7eee9", surface: "#ead8d0", surfaceAlt: "#d6e6ec", accentSoft: "#c2dae4", accent: "#91bacd", accentStrong: "#658fa5", line: "#dac6bd", muted: "#63534d", fg: "#101010" },
    { bg: "#f5f1e9", surface: "#e5dccf", surfaceAlt: "#ead8c7", accentSoft: "#e0c3a9", accent: "#c9936c", accentStrong: "#9e6b45", line: "#d5cabb", muted: "#5d554b", fg: "#101010" },
    { bg: "#f1f5ee", surface: "#dee8d9", surfaceAlt: "#ecd9d7", accentSoft: "#e0c2bf", accent: "#ca9088", accentStrong: "#9f6860", line: "#ccd9c7", muted: "#505b4c", fg: "#101010" },
    { bg: "#f2f6f0", surface: "#dce9df", surfaceAlt: "#eadfcd", accentSoft: "#dbc7a5", accent: "#bb9b64", accentStrong: "#8d723e", line: "#cadbce", muted: "#4f5b52", fg: "#101010" },
    { bg: "#f8f0f3", surface: "#ebdce2", surfaceAlt: "#d9e5f0", accentSoft: "#c5d7ea", accent: "#95b1d3", accentStrong: "#6784a8", line: "#dbc8d0", muted: "#63545a", fg: "#101010" },
    { bg: "#f2f4f7", surface: "#dee4eb", surfaceAlt: "#eadfcf", accentSoft: "#dfc79f", accent: "#c49b60", accentStrong: "#96713d", line: "#ccd4de", muted: "#525b65", fg: "#101010" },
    { bg: "#f6f2eb", surface: "#e7dfcf", surfaceAlt: "#d8e7dd", accentSoft: "#c4ddcc", accent: "#95c0a0", accentStrong: "#698f71", line: "#d6ccbb", muted: "#5f574b", fg: "#101010" },

    { bg: "#f1f5f2", surface: "#dfe8e2", surfaceAlt: "#eaded4", accentSoft: "#dfc8b9", accent: "#c49b80", accentStrong: "#98745b", line: "#cdd9d1", muted: "#505a54", fg: "#101010" },
    { bg: "#eff4f1", surface: "#dbe7e1", surfaceAlt: "#eadbd9", accentSoft: "#dfc4c0", accent: "#c58f88", accentStrong: "#986860", line: "#c9d8d0", muted: "#4f5a56", fg: "#101010" },
    { bg: "#f0f5ed", surface: "#dee8d7", surfaceAlt: "#e8dde9", accentSoft: "#d4c3df", accent: "#ad92c3", accentStrong: "#80649a", line: "#ccd9c5", muted: "#515b4d", fg: "#101010" },
    { bg: "#edf5f3", surface: "#d8e8e4", surfaceAlt: "#eadfd0", accentSoft: "#decaa9", accent: "#bd9f68", accentStrong: "#8e7541", line: "#c5d9d4", muted: "#4e5b58", fg: "#101010" },
    { bg: "#f1f4ee", surface: "#e0e6d9", surfaceAlt: "#d9e3eb", accentSoft: "#c7d5e6", accent: "#99afd0", accentStrong: "#6b83a5", line: "#cfd7c8", muted: "#535a4f", fg: "#101010" },
    { bg: "#f3f4ec", surface: "#e5e6d5", surfaceAlt: "#eadad2", accentSoft: "#dec4b7", accent: "#c1937d", accentStrong: "#956b55", line: "#d3d4c2", muted: "#595a4f", fg: "#101010" },
    { bg: "#edf4f0", surface: "#d9e6df", surfaceAlt: "#e8dcd0", accentSoft: "#dbc6a9", accent: "#bb9a67", accentStrong: "#8d7243", line: "#c7d7ce", muted: "#4e5953", fg: "#101010" },
    { bg: "#f2f5ef", surface: "#e1e8da", surfaceAlt: "#e8d8dc", accentSoft: "#ddc1c9", accent: "#c28d9b", accentStrong: "#956575", line: "#d0d9c8", muted: "#545b50", fg: "#101010" },
    { bg: "#eef5f1", surface: "#dbe7e0", surfaceAlt: "#e6e0cf", accentSoft: "#d5c7a5", accent: "#b4a067", accentStrong: "#857641", line: "#c8d7cf", muted: "#4f5a54", fg: "#101010" },
    { bg: "#f0f5f3", surface: "#dce8e5", surfaceAlt: "#e9d9d2", accentSoft: "#dec3b4", accent: "#c29477", accentStrong: "#966b50", line: "#cad9d5", muted: "#4f5b58", fg: "#101010" },

    { bg: "#f6f4e8", surface: "#eae5cc", surfaceAlt: "#ded9eb", accentSoft: "#d3c5e4", accent: "#aa94ca", accentStrong: "#7c669f", line: "#d9d2b9", muted: "#605c4b", fg: "#101010" },
    { bg: "#f7f5e9", surface: "#ebe6cf", surfaceAlt: "#d9e5ea", accentSoft: "#c5d8e2", accent: "#98b7c9", accentStrong: "#6d8da1", line: "#dad3bd", muted: "#615c4c", fg: "#101010" },
    { bg: "#f5f4e7", surface: "#e8e4ca", surfaceAlt: "#ead9d8", accentSoft: "#dfc2c0", accent: "#c58d89", accentStrong: "#98645f", line: "#d7d0b6", muted: "#5f5a49", fg: "#101010" },
    { bg: "#f4f5e9", surface: "#e4e8ce", surfaceAlt: "#dce3ea", accentSoft: "#c9d5e5", accent: "#9aafcf", accentStrong: "#6d82a4", line: "#d2d7bb", muted: "#5a5d4d", fg: "#101010" },
    { bg: "#f7f3e6", surface: "#ebe1c9", surfaceAlt: "#d8e6de", accentSoft: "#c1dbcc", accent: "#91bfa1", accentStrong: "#669176", line: "#dacfb5", muted: "#62594a", fg: "#101010" },
    { bg: "#f6f4e9", surface: "#e9e4d0", surfaceAlt: "#e4d8e8", accentSoft: "#d7c4df", accent: "#b797c5", accentStrong: "#8a6999", line: "#d8d1bd", muted: "#605b4d", fg: "#101010" },
    { bg: "#f3f5e8", surface: "#e2e8cd", surfaceAlt: "#eadad0", accentSoft: "#dfc4b3", accent: "#c19373", accentStrong: "#956a4e", line: "#d0d7ba", muted: "#585d4b", fg: "#101010" },
    { bg: "#f5f4e8", surface: "#e7e4cf", surfaceAlt: "#d8e5e8", accentSoft: "#c2d8de", accent: "#92b7c2", accentStrong: "#668c96", line: "#d6d0bd", muted: "#5d5b4d", fg: "#101010" },
    { bg: "#f7f2e7", surface: "#eadfca", surfaceAlt: "#e1d8eb", accentSoft: "#d2c5e3", accent: "#a994c9", accentStrong: "#7c669f", line: "#dacdb7", muted: "#62584b", fg: "#101010" },
    { bg: "#f4f5ea", surface: "#e4e7d1", surfaceAlt: "#e9dbd2", accentSoft: "#dec5b5", accent: "#c19676", accentStrong: "#946d50", line: "#d2d6bf", muted: "#595d4f", fg: "#101010" },

    { bg: "#f6eff2", surface: "#eadce2", surfaceAlt: "#d9e4ed", accentSoft: "#c8d6e8", accent: "#9ab0d0", accentStrong: "#6d82a5", line: "#dac8d0", muted: "#62545a", fg: "#101010" },
    { bg: "#f7eef0", surface: "#ead9df", surfaceAlt: "#dce7df", accentSoft: "#c8dbcf", accent: "#9abea5", accentStrong: "#6f9078", line: "#dbc5cc", muted: "#635158", fg: "#101010" },
    { bg: "#f5eef3", surface: "#e7d9e2", surfaceAlt: "#e8dfcf", accentSoft: "#ddc8a8", accent: "#bd9d68", accentStrong: "#8f7441", line: "#d7c5cf", muted: "#5f5259", fg: "#101010" },
    { bg: "#f6eff0", surface: "#e9dbdd", surfaceAlt: "#d8e5e7", accentSoft: "#c3d8de", accent: "#94b8c2", accentStrong: "#698d96", line: "#d9c7ca", muted: "#615356", fg: "#101010" },
    { bg: "#f8eef1", surface: "#ecd9df", surfaceAlt: "#e4e0cd", accentSoft: "#d8c8a3", accent: "#b79f62", accentStrong: "#88743d", line: "#dcc5cc", muted: "#655157", fg: "#101010" },
    { bg: "#f5f0f4", surface: "#e6dce5", surfaceAlt: "#d9e6dc", accentSoft: "#c4dbca", accent: "#93bf9e", accentStrong: "#688f70", line: "#d6c9d4", muted: "#5e555d", fg: "#101010" },
    { bg: "#f7eef3", surface: "#ead9e3", surfaceAlt: "#dbe3ed", accentSoft: "#c8d4e8", accent: "#99abcd", accentStrong: "#6d7fa0", line: "#dac5d0", muted: "#62515a", fg: "#101010" },
    { bg: "#f6f0f1", surface: "#e8dcde", surfaceAlt: "#e5dfd1", accentSoft: "#dac8aa", accent: "#ba9c67", accentStrong: "#8b7242", line: "#d8c9cb", muted: "#605557", fg: "#101010" },
    { bg: "#f7edf0", surface: "#ead6dc", surfaceAlt: "#d8e7e1", accentSoft: "#c0dacd", accent: "#91bdA4", accentStrong: "#678f78", line: "#dbc2ca", muted: "#635056", fg: "#101010" },
    { bg: "#f5eff2", surface: "#e6dbe1", surfaceAlt: "#dbe4ea", accentSoft: "#c8d5e4", accent: "#9bb2ca", accentStrong: "#70879f", line: "#d6c8cf", muted: "#5e5459", fg: "#101010" },

    { bg: "#f0f3f6", surface: "#dfe5ea", surfaceAlt: "#eadfd2", accentSoft: "#dfc8aa", accent: "#c59d68", accentStrong: "#977442", line: "#cfd5dc", muted: "#535a62", fg: "#101010" },
    { bg: "#eff3f5", surface: "#dce4e8", surfaceAlt: "#eadbd7", accentSoft: "#dfc4bb", accent: "#c39180", accentStrong: "#96695a", line: "#cbd4da", muted: "#515a61", fg: "#101010" },
    { bg: "#f1f3f4", surface: "#e0e4e6", surfaceAlt: "#dfe0ed", accentSoft: "#d0c9e5", accent: "#a99acb", accentStrong: "#7c6da0", line: "#d0d4d8", muted: "#555a5e", fg: "#101010" },
    { bg: "#eef3f5", surface: "#dbe3e7", surfaceAlt: "#e8dfd0", accentSoft: "#dac9a6", accent: "#b89e64", accentStrong: "#89743f", line: "#cad3d9", muted: "#505a61", fg: "#101010" },
    { bg: "#f2f3f5", surface: "#e1e4e8", surfaceAlt: "#d9e6dd", accentSoft: "#c4dbcc", accent: "#95bf9f", accentStrong: "#698f71", line: "#d1d5dc", muted: "#565a61", fg: "#101010" },
    { bg: "#eff4f6", surface: "#dce5e9", surfaceAlt: "#eadbd0", accentSoft: "#dfc6ad", accent: "#c49a70", accentStrong: "#976f49", line: "#ccd6dc", muted: "#515b62", fg: "#101010" },
    { bg: "#f0f3f5", surface: "#dee4e7", surfaceAlt: "#e8dbe4", accentSoft: "#dcc4d4", accent: "#bd90aa", accentStrong: "#90677f", line: "#ced4d9", muted: "#535a60", fg: "#101010" },
    { bg: "#edf4f6", surface: "#d9e5e9", surfaceAlt: "#e8dfcf", accentSoft: "#d9c8a6", accent: "#b59e65", accentStrong: "#867440", line: "#c7d5dc", muted: "#4e5b62", fg: "#101010" },
    { bg: "#f1f4f5", surface: "#dfe5e7", surfaceAlt: "#eaded7", accentSoft: "#dec6ba", accent: "#c39782", accentStrong: "#966d5b", line: "#cfd6d9", muted: "#545b60", fg: "#101010" },
    { bg: "#eff3f6", surface: "#dce3e9", surfaceAlt: "#dce6da", accentSoft: "#c7dac7", accent: "#9bbd98", accentStrong: "#718e6e", line: "#ccd3dc", muted: "#515960", fg: "#101010" },

    { bg: "#f4f1e9", surface: "#e6dfd0", surfaceAlt: "#dce7db", accentSoft: "#c7dcc8", accent: "#9dbd97", accentStrong: "#748d6b", line: "#d4cbbc", muted: "#5d574c", fg: "#101010" },
    { bg: "#f5f0e8", surface: "#e8ddcd", surfaceAlt: "#ead8d2", accentSoft: "#dec3b4", accent: "#c09374", accentStrong: "#936a4e", line: "#d7c9b9", muted: "#60564b", fg: "#101010" },
    { bg: "#f3f2e8", surface: "#e3e1cc", surfaceAlt: "#d8e5e2", accentSoft: "#c2d9d5", accent: "#92b9b1", accentStrong: "#668d86", line: "#d1ceba", muted: "#5a594c", fg: "#101010" },
    { bg: "#f5f1eb", surface: "#e8dfd4", surfaceAlt: "#e4d9e8", accentSoft: "#d7c4df", accent: "#b796c4", accentStrong: "#89699a", line: "#d7cec2", muted: "#5f574f", fg: "#101010" },
    { bg: "#f3f1e9", surface: "#e3dfd0", surfaceAlt: "#dbe6e8", accentSoft: "#c5d8de", accent: "#95b7c1", accentStrong: "#698c96", line: "#d1ccb9", muted: "#5a574d", fg: "#101010" },
    { bg: "#f6f0e9", surface: "#eadbcd", surfaceAlt: "#d9e6dd", accentSoft: "#c4dccb", accent: "#95c0a0", accentStrong: "#688f70", line: "#dac8b9", muted: "#62554b", fg: "#101010" },
    { bg: "#f4f2ea", surface: "#e5dfd0", surfaceAlt: "#ead9d6", accentSoft: "#dec3bd", accent: "#c28e84", accentStrong: "#94665d", line: "#d4cdbb", muted: "#5c584d", fg: "#101010" },
    { bg: "#f5f2ec", surface: "#e7e0d5", surfaceAlt: "#dce4ec", accentSoft: "#c9d5e8", accent: "#9aafd0", accentStrong: "#6d82a5", line: "#d6cec3", muted: "#5e5850", fg: "#101010" },
    { bg: "#f2f1e9", surface: "#e1dfcf", surfaceAlt: "#e8dbc9", accentSoft: "#dcc4a2", accent: "#bd9960", accentStrong: "#8e713b", line: "#d0ccba", muted: "#59574d", fg: "#101010" },
    { bg: "#f5f0eb", surface: "#e8ddd4", surfaceAlt: "#d8e5e6", accentSoft: "#c2d8dc", accent: "#92b6be", accentStrong: "#668a92", line: "#d8cac0", muted: "#60564f", fg: "#101010" },

    { bg: "#eef6f6", surface: "#d9e8e8", surfaceAlt: "#eadfd6", accentSoft: "#dec8b5", accent: "#c39a7a", accentStrong: "#966f51", line: "#c7dad9", muted: "#4e5d5d", fg: "#101010" },
    { bg: "#eff5f4", surface: "#dce7e6", surfaceAlt: "#e8dbd3", accentSoft: "#dcc4b5", accent: "#bf9378", accentStrong: "#916a50", line: "#c9d7d6", muted: "#505b5a", fg: "#101010" },
    { bg: "#edf6f5", surface: "#d8e9e7", surfaceAlt: "#e5ddeb", accentSoft: "#d7c7e4", accent: "#b69acd", accentStrong: "#876da2", line: "#c5dad8", muted: "#4d5d5b", fg: "#101010" },
    { bg: "#f0f6f5", surface: "#dfe8e7", surfaceAlt: "#eadfcd", accentSoft: "#dbc7a5", accent: "#bb9b64", accentStrong: "#8d723e", line: "#cdd9d8", muted: "#515d5c", fg: "#101010" },
    { bg: "#edf5f5", surface: "#d8e6e6", surfaceAlt: "#eadad8", accentSoft: "#dfc3c0", accent: "#c58d89", accentStrong: "#98645f", line: "#c5d8d8", muted: "#4d5b5b", fg: "#101010" },
    { bg: "#eff6f4", surface: "#dbe9e5", surfaceAlt: "#e7dfcf", accentSoft: "#d8c8a4", accent: "#b79f62", accentStrong: "#88743d", line: "#c8dad5", muted: "#4f5d59", fg: "#101010" },
    { bg: "#eef5f6", surface: "#dae6e8", surfaceAlt: "#e8dce4", accentSoft: "#dcc4d4", accent: "#bd90aa", accentStrong: "#90677f", line: "#c8d8da", muted: "#4f5b5d", fg: "#101010" },
    { bg: "#edf6f3", surface: "#d8e9e2", surfaceAlt: "#eaded2", accentSoft: "#dfc8ad", accent: "#c49d70", accentStrong: "#967349", line: "#c5dad1", muted: "#4d5d57", fg: "#101010" },
    { bg: "#f0f5f6", surface: "#dfe7e9", surfaceAlt: "#e6dfd0", accentSoft: "#d7c8a7", accent: "#b79f66", accentStrong: "#887440", line: "#cdd8da", muted: "#525c5e", fg: "#101010" },
    { bg: "#eef6f5", surface: "#dae8e6", surfaceAlt: "#eadbd8", accentSoft: "#dfc3bd", accent: "#c49185", accentStrong: "#96685c", line: "#c7dad7", muted: "#4f5d5b", fg: "#101010" },

    { bg: "#f3eff7", surface: "#e2dcea", surfaceAlt: "#e5e3cf", accentSoft: "#d5c99f", accent: "#b4a060", accentStrong: "#85733c", line: "#d1c9dc", muted: "#5a5560", fg: "#101010" },
    { bg: "#f2eef6", surface: "#e0d9e9", surfaceAlt: "#dbe7dc", accentSoft: "#c5dcc9", accent: "#96bf9c", accentStrong: "#6a8f6e", line: "#cfc6db", muted: "#58535f", fg: "#101010" },
    { bg: "#f4eff6", surface: "#e4dbe8", surfaceAlt: "#eaded0", accentSoft: "#dfc8aa", accent: "#c39c69", accentStrong: "#947342", line: "#d4c8da", muted: "#5d5560", fg: "#101010" },
    { bg: "#f1eef6", surface: "#ded9e8", surfaceAlt: "#d8e6e8", accentSoft: "#c2d8dd", accent: "#92b6bf", accentStrong: "#668a94", line: "#ccc6d9", muted: "#56525e", fg: "#101010" },
    { bg: "#f5eff6", surface: "#e5dbe8", surfaceAlt: "#e8dfcf", accentSoft: "#d9c8a6", accent: "#b89e64", accentStrong: "#89743f", line: "#d5c8da", muted: "#5f5560", fg: "#101010" },
    { bg: "#f2f0f7", surface: "#e0ddea", surfaceAlt: "#eadbd7", accentSoft: "#dfc4bb", accent: "#c39180", accentStrong: "#96695a", line: "#d0cadd", muted: "#585660", fg: "#101010" },
    { bg: "#f3eef5", surface: "#e2d9e5", surfaceAlt: "#dbe6dc", accentSoft: "#c6dac9", accent: "#9abd9d", accentStrong: "#708d70", line: "#d1c5d5", muted: "#5a525d", fg: "#101010" },
    { bg: "#f4eff7", surface: "#e3dbea", surfaceAlt: "#e8dfce", accentSoft: "#d8c8a3", accent: "#b79f62", accentStrong: "#88743d", line: "#d3c8dc", muted: "#5c5561", fg: "#101010" },
    { bg: "#f1edf5", surface: "#ded8e5", surfaceAlt: "#d8e5e6", accentSoft: "#c2d8dc", accent: "#92b6be", accentStrong: "#668a92", line: "#ccc4d5", muted: "#56515d", fg: "#101010" },
    { bg: "#f5f0f6", surface: "#e5dce8", surfaceAlt: "#eadcd2", accentSoft: "#dfc5b3", accent: "#c19474", accentStrong: "#956b4e", line: "#d5c9d9", muted: "#5f5660", fg: "#101010" },

    { bg: "#f7f1ec", surface: "#ebddd4", surfaceAlt: "#d8e5ee", accentSoft: "#c4d6e8", accent: "#95afd0", accentStrong: "#6883a5", line: "#dccbc0", muted: "#64574f", fg: "#101010" },
    { bg: "#f8f0ea", surface: "#ecdacd", surfaceAlt: "#d9e7dc", accentSoft: "#c4dcc9", accent: "#95bf9c", accentStrong: "#698f6e", line: "#ddc7b9", muted: "#65544b", fg: "#101010" },
    { bg: "#f7f2ed", surface: "#e9ded5", surfaceAlt: "#e2d8eb", accentSoft: "#d3c4e1", accent: "#aa95c7", accentStrong: "#7c689c", line: "#d9cdc3", muted: "#625850", fg: "#101010" },
    { bg: "#f6f0ea", surface: "#e9dacf", surfaceAlt: "#d8e6e5", accentSoft: "#c2d9d7", accent: "#92b9b4", accentStrong: "#668d88", line: "#d9c8bc", muted: "#61554c", fg: "#101010" },
    { bg: "#f8f2ed", surface: "#ecdfd5", surfaceAlt: "#e7dfcf", accentSoft: "#d9c8a6", accent: "#b89e64", accentStrong: "#89743f", line: "#dccfc4", muted: "#655950", fg: "#101010" },
    { bg: "#f7efe9", surface: "#ead9cd", surfaceAlt: "#d9e5df", accentSoft: "#c4dacd", accent: "#95bda2", accentStrong: "#698f76", line: "#dac6b8", muted: "#625349", fg: "#101010" },
    { bg: "#f6f1ec", surface: "#e8ddd4", surfaceAlt: "#ead9dc", accentSoft: "#dfc2c9", accent: "#c28d9a", accentStrong: "#956573", line: "#d8cbc1", muted: "#60574f", fg: "#101010" },
    { bg: "#f8f0ec", surface: "#ecdcd3", surfaceAlt: "#d8e5ea", accentSoft: "#c3d7e2", accent: "#94b7c8", accentStrong: "#688ca0", line: "#ddc9bf", muted: "#65564f", fg: "#101010" },
    { bg: "#f7f3ef", surface: "#e9e0d8", surfaceAlt: "#e4dfcf", accentSoft: "#d6c8a6", accent: "#b5a067", accentStrong: "#867541", line: "#d9d0c6", muted: "#625b54", fg: "#101010" },
    { bg: "#f8f1ed", surface: "#ecded5", surfaceAlt: "#d8e4ec", accentSoft: "#c3d5e5", accent: "#94b1cd", accentStrong: "#6885a2", line: "#ddccc2", muted: "#655850", fg: "#101010" }
  ];

  function randomThemeId() {
    return Math.floor(Math.random() * PALETTES.length) + 1;
  }

  function normalizeThemeId(value) {
    var id = Number(value);
    return Number.isInteger(id) && id >= 1 && id <= PALETTES.length ? id : null;
  }

  function pickThemeId() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = normalizeThemeId(params.get("theme"));
    var nav = performance.getEntriesByType("navigation")[0];
    var isReload = nav && nav.type === "reload";

    if (isReload) {
      return randomThemeId();
    }
    if (fromUrl) {
      return fromUrl;
    }
    if (document.referrer) {
      try {
        var ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          var fromRef = normalizeThemeId(ref.searchParams.get("theme"));
          if (fromRef) return fromRef;
        }
      } catch (_e) {}
    }
    return randomThemeId();
  }

  function withThemeParam(url, themeId) {
    var parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("theme", String(themeId));
    return parsed;
  }

  function syncCurrentUrl(themeId) {
    var next = withThemeParam(window.location.href, themeId);
    var nextHref = next.pathname + next.search + next.hash;
    var currentHref = window.location.pathname + window.location.search + window.location.hash;
    if (nextHref !== currentHref) {
      window.history.replaceState({}, "", nextHref);
    }
  }

  function syncInternalLinks(themeId) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;

      var parsed = new URL(href, window.location.origin);
      if (parsed.origin !== window.location.origin) return;

      parsed.searchParams.set("theme", String(themeId));
      a.setAttribute("href", parsed.pathname + parsed.search + parsed.hash);
    });
  }

  function applyTheme(theme, themeId) {
    var root = document.documentElement;
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--fg", theme.fg);
    root.style.setProperty("--muted", theme.muted);
    root.style.setProperty("--line", theme.line);
    root.style.setProperty("--line-strong", theme.accent);
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--surface-alt", theme.surfaceAlt);
    root.style.setProperty("--accent-soft", theme.accentSoft);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-strong", theme.accentStrong);
    root.style.setProperty("--control-bg", theme.surface);
    root.style.setProperty("--control-bg-hover", theme.accentSoft);
    root.style.setProperty("--control-border", theme.line);
    root.style.setProperty("--control-border-strong", theme.accent);
    root.style.setProperty("--control-focus", theme.accentStrong);
    root.setAttribute("data-theme-id", "theme-" + String(themeId).padStart(3, "0"));

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", theme.bg);
  }

  try {
    var themeId = pickThemeId();
    var theme = PALETTES[themeId - 1];
    applyTheme(theme, themeId);
    syncCurrentUrl(themeId);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        syncInternalLinks(themeId);
      }, { once: true });
    } else {
      syncInternalLinks(themeId);
    }
    window.__b2nnyTheme = Object.assign({ id: themeId }, theme);
  } catch (error) {
    // Keep default CSS tokens if theme initialization fails.
  }
})();
