let pcounter = document.getElementById('pcounter');

// interval replace %num% with number of players in the pcouter element
// get the players from endpoint /onlineplayers

function updatePlayers() {
  fetch('/onlineplayers')
    .then(res => res.text())
    .then(text => pcounter.innerHTML = `There are ${text} players online.`);
}

updatePlayers()
setInterval(updatePlayers, 1000);