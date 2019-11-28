# ln-centrality

Script used to analyze the betweenness centrality of your node in the network and make channel suggestions.

## Disclaimer
First of all, this is pretty much a work in progress, so expect *a lot of* rough edges. But since it just analyzes the network description, no funds will be at risk.

## Introduction

This tool is meant to analyze the topology of the LN as presented by the command `lncli describegraph`. The idea here is to analyze how well connected your node is and to suggest which nodes will significantly improve your position in the network if you were to open channels with them.

The main concept here is the one of [betweenness centrality](https://en.wikipedia.org/wiki/Betweenness_centrality). This property roughly means how much a particular node acts as a "bridge" given a specific network graph.

This anlysis only considers the raw network topology though and ignores channel capacities & fee rates.

## Use

After cloning, enter the `ln-centrality` directory and install dependencies.
```
npm install
```

On the machine where your `lnd` instance is running, type: 
```
lncli describegraph > graph.json
```

The move the resulting `graph.json` file to the `src/assets` folder.

Then:

```
node . -t <target_node_id>
```

## Options
```
Options:
  --version                       Show version number                  [boolean]
  --target-node, -t               Specifies the target node. [string] [required]
  --min-capacity, -c              Minimum channel capacity to be considered in
                                  the analysis.        [number] [default: 95000]
  --min-last-update, --lu         The minimum value for a the `last_update`
                                  value of a channel, measured as an POSIX
                                  timestamp.                            [number]
  --max-channel-inactivity, --ci  The maximum amount channel inactivity to be
                                  allowed, measured in seconds and relative to
                                  the time this script is executed.     [number]
  --help, -h                      Show help                            [boolean]
```

## Example
```
node . -t 02f6725f9c1c40333b67faea92fd211c183050f28df32cac3f9d69685fe9665432
```

```
>>> About to analyze network graph <<< 
-- Parameters --
Min Capacity....: 95000 sats
Nodes...........: 4076
Edges...........: 27710
Simulations.....: 4075
-- Time result --
Main processing....: [main: 111.796 ms.| post: 0.015]
-- Node ranking --
0]..............: 0331f80652fb840239df8dc99205792bba2e559a05469915804c08420230e23c7c, 1309472.7717170583
1]..............: 02ad6fb8d693dc1e4569bcedefadf5f72a931ae027dc0f0c544b34c1c6f3b9a02b, 1105040.2181056326
2]..............: 03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f, 857372.6274275557
3]..............: 0217890e3aad8d35bc054f43acc00084b25229ecff0ab68debd82883ad65ee8266, 649325.9557379506

...

4074]..............: 025d87e2c7ebaa4e8f0e82349d273930519e34620aef6576269a7659d7b1c69d73, 0
4075]..............: 021308eab9e9f2b03a728f78e907051ddfecbe2592315bc9bc5b91e4b222182f33, 0
-- Node of Interest --
Pubkey...........: 02d1fa530f8303e6dcaecc4efe22e98b4db1dece72192a24004dcb9f4607051ba0
Betweeenness.....: 67.53225254313409
Node rank........: 1499

>> >> SIMULATIONS << << 

-- Simulation 0 -- 
02d1fa530f8303e6dcaecc4efe22e98b4db1dece72192a24004dcb9f4607051ba0 <=> 0331f80652fb840239df8dc99205792bba2e559a05469915804c08420230e23c7c
-- Time result --
Processing time......: [main: 98.008 ms.| post: 0.011]
Resulting node rank..: 1319, jumped 180 positions
Altered betweenness..: 106.1640206445387

-- Simulation 1 -- 
02d1fa530f8303e6dcaecc4efe22e98b4db1dece72192a24004dcb9f4607051ba0 <=> 02ad6fb8d693dc1e4569bcedefadf5f72a931ae027dc0f0c544b34c1c6f3b9a02b
-- Time result --
Processing time......: [main: 100.585 ms.| post: 0.006]
Resulting node rank..: 1460, jumped 39 positions
Altered betweenness..: 76.38362519207372

...

```

The script first analyzes the whole network and prints a list of all nodes, ranked by their betweenness. Then it prints the betweenness and position in the ranking of the node of interest.

Finally, it will proceed to run simulations where it would add a single channel to every other node and recalculate the target node's (well the whole network' really) betweenness.

## Notes
There are still many things that can be improved on this. But here are just some thoughts:

- When simulating, we don't need to recalculate the betweenness of the whole network again, this is a major waste of resources, but since the graph library I'm using doesn't allow to calculate the betweeness of a single node, this is how it works now.
- Maybe the simulation work (specially now that is so inneficient) could be split into several workers.
- Analyzing the betweenness after adding a channel is interesting, but we should also allow the user to calculate the betweenness resulting from the removal of an existing channel, thus suggesting which channels could be removed and have their funds better allocated somewhere else.
- A way to obtain the graph description over the network is a must, currently the script expects the LN graph description to be at `src/assets/graph.json`, but this should ideally be obtained from the `lnd` instance on-demand.
- It would probably be better to separate the initial analysis from the simulation. I might introduce some commands for this.
- Taking in consideration channel rates?

The original idea came from [this video](https://www.youtube.com/watch?v=L39IvFqTZk8&feature=youtu.be&t=213)
