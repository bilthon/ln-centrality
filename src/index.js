const centrality = require('ngraph.centrality');
const g = require('ngraph.graph')();
const lnGraph = require('./assets/graph.json');
const fs = require('fs');
const yargs = require('yargs');

const argv = yargs
  .option('target-node', {
    alias: 't',
    description: 'Specifies the target node.',
    type: 'string'
  })
  .option('min-capacity', {
    alias: 'c',
    description: 'Minimum channel capacity to be considered in the analysis.',
    type: 'number',
    default: 95000
  })
  .option('min-last-update', {
    alias: 'lu',
    description: 'The minimum value for a the `last_update` value of a channel, measured as an POSIX timestamp.',
    type: 'number'
  })
  .option('max-channel-inactivity', {
    alias: 'ci',
    description: 'The maximum amount channel inactivity to be allowed, measured in seconds and relative to the time this script is executed.',
    type: 'number'
  })
  .conflicts('min-last-update','max-channel-inactivity')
  .demandOption('target-node', 'Please provide a target node for analysis')
  .help()
  .alias('help', 'h')
  .argv;

// The node of interest
const targetPubKey = argv.targetNode;

let MIN_LAST_UPDATE = 0;
if(argv.minLastUpdate){
  MIN_LAST_UPDATE = argv.minLastUpdate;
}else if(argv.maxChannelInactivity){
  MIN_LAST_UPDATE = (new Date().getTime() / 1000) - argv.maxChannelInactivity;
}

let sorted = [];

// Building network graph:
for(let i = 0; i < lnGraph.edges.length; i++){
  let edge = lnGraph.edges[i];
  if(parseInt(edge.capacity) > argv.minCapacity){
    const node1 = lnGraph.nodes.find(node => node.pub_key === edge.node1_pub);
    const node2 = lnGraph.nodes.find(node => node.pub_key === edge.node2_pub);
    const now = parseInt(new Date().getTime() / 1000);
    if(node1.last_update > MIN_LAST_UPDATE && node2.last_update > MIN_LAST_UPDATE){
      g.addLink(edge.node1_pub, edge.node2_pub);
    }
  }
}
// We will simulate an extra connection to every other node,
// except the node of interest
const SIMULATION_COUNT = g.getNodesCount() - 1;

console.log('>>> About to analyze network graph <<< ');
console.log('-- Parameters --');
console.log(`Min Capacity....: ${argv.minCapacity} sats`);
console.log(`Nodes...........: ${g.getNodesCount()}`);
console.log(`Edges...........: ${g.getLinksCount()}`);
console.log(`Simulations.....: ${SIMULATION_COUNT}`);

const t0 = new Date().getTime();
// this will consider graph as undirected:
var betweenness = centrality.betweenness(g);
const t1 = new Date().getTime();
sorted = Object
          .keys(betweenness)
          .map(key => Object.assign({pubkey: key, betweeness: betweenness[key]}))
          .sort((first, second) => second.betweeness - first.betweeness);
const index = sorted.findIndex(node => node.pubkey === targetPubKey);
if(index < 0) {
  console.error('Error: could not find target node in the graph');
  return;
}
const t2 = new Date().getTime();

// Results
console.log('-- Time result --');
console.log(`Main processing....: [main: ${(t1 - t0) / 1000} ms.| post: ${(t2 - t1) / 1000}]`);
console.log('-- Node ranking --');
for(let i = 0; i < sorted.length; i++){
  console.log(`${i}]..............: ${sorted[i].pubkey}, ${sorted[i].betweeness}`);
}
console.log('-- Node of Interest --');
console.log(`Pubkey...........: ${sorted[index].pubkey}`);
console.log(`Betweeenness.....: ${sorted[index].betweeness}`);
console.log(`Node rank........: ${index}\n`);

// Clearing graph
g.clear();

console.log('>> >> SIMULATIONS << << ');
let simResult = [];
// Simulating extra connections
for(let i = 0; i < sorted.length && i < SIMULATION_COUNT; i++){
  console.log(`\n-- Simulation ${i} -- `);
  // Building network graph
  g.clear();
  for(let i = 0; i < lnGraph.edges.length; i++){
    let edge = lnGraph.edges[i];
    if(parseInt(edge.capacity) > argv.minCapacity){
      const node1 = lnGraph.nodes.find(node => node.pub_key === edge.node1_pub);
      const node2 = lnGraph.nodes.find(node => node.pub_key === edge.node2_pub);
      const now = parseInt(new Date().getTime() / 1000);
      if(node1.last_update > MIN_LAST_UPDATE && node2.last_update > MIN_LAST_UPDATE){
        g.addLink(edge.node1_pub, edge.node2_pub);
      }
    }
  }
  // Adding extra test edge
  const experimentalNode = sorted[i].pubkey;
  if(targetPubKey !== experimentalNode){
    g.addLink(targetPubKey, experimentalNode);
    console.log(`${targetPubKey} <=> ${experimentalNode}`);
  }else{
    console.log('Skipping self');
    continue;
  }

  const targetNode = {id: targetPubKey};
  const t0 = new Date().getTime();
  // this will consider graph as undirected
  var betweenness = centrality.betweenness(g, false);
  const t1 = new Date().getTime();
  sorted = Object
            .keys(betweenness)
            .map(key => Object.assign({pubkey: key, betweeness: betweenness[key]}))
            .sort((first, second) => second.betweeness - first.betweeness);

  const index = sorted.findIndex(node => node.pubkey === targetPubKey);
  const t2 = new Date().getTime();

  // Results
  console.log('-- Time result --')
  console.log(`Main processing....: [main: ${(t1 - t0) / 1000} ms.| post: ${(t2 - t1) / 1000}]`);
  console.log(`Node of interest...: ${sorted[index].pubkey}`);
  console.log(`Current node rank..: ${index}`);
  console.log(`Current betweenness: ${sorted[index].betweeness}`);
  console.log(`Altered betweenness: ${betweenness[targetPubKey]}`);
  simResult.push({
    betweenness: betweenness[targetPubKey],
    target: targetPubKey
  });
}
simResult = simResult.sort((first, second) => second.betweenness - first.betweenness);
for(const result of simResult){
  console.log(`${experimentalNode}, ${result.betweenness}`);
}
