App = {
    contracts: {},
    web3Provider: null,
    url: 'http://localhost:8545',
    account: '0x0',
    round_state: false,
    manager_account: false,
    lotteryUp: false,
    tickets: 0,
    // Store contract abstractions
    // Web3 provider
    // Url for web3
    // current ethereum account
    init: function () {
        return App.initWeb3();
    },

    initWeb3: function () {
        if (typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
            App.web3Provider = window.ethereum; // standard since 2/11/18
            web3 = new Web3(App.web3Provider);
            try { // Permission popup
                ethereum.request({ method: 'eth_requestAccounts' }).then(async () => { console.log("DApp connected"); });
            }
            catch (error) { console.log(error); }
        } else { // Otherwise, create a new local instance of Web3
            App.web3Provider = new Web3.providers.HttpProvider(App.url);
            web3 = new Web3(App.web3Provider);
        }
        return App.initContract();
    },

    initContract: function () {
        // Store ETH current account
        web3.eth.getCoinbase(function (err, account) {
            if (err == null) {
                App.account = account;
                console.log(account);
                $("#accountId").html("Your address: " + account);
            }
        });
        // Init contracts
        $.getJSON("LotteryTry.json").done(function (c) {
            App.contracts["Contract"] = TruffleContract(c);
            App.contracts["Contract"].setProvider(App.web3Provider);
            return App.listenForEvents();
        });
    },

    listenForEvents: function () {
        App.contracts["Contract"].deployed().then(async (instance) => {
            // catch events here
            instance.RoundState().on('data', function (event) {
                App.round_state = event.returnValues.round_state;
                console.log("Event RoundState");
                if (!App.manager_account) {
                    if (event.returnValues.round_state) alert("Round started");
                    else alert("Round closed");
                }
            });

            instance.LotteryCreated().on('data', function (event) {
                if (!App.manager_account) {
                    alert("Lottery created");
                    window.location.reload();
                }
            });

        });

        //refresh when account changes
        ethereum.on('accountsChanged', function (accounts) {
            window.location.reload();
        });

        return App.selectAccount();
    },
    selectAccount: function () {
        App.contracts["Contract"].deployed().then(async (instance) => {
            const manager = await instance.manager();
            if (manager.toLowerCase() == App.account) {
                App.manager_account = true;
            }
            else {
                App.manager_account = false;
            }
            return App.render();
        });

    },
    render: function () {
        // render the page
        if (App.manager_account) {
            $("#managerUI").show();
            $("#playerUI").hide();
        }
        else {
            // render player page
            $("#managerUI").hide();
            $("#playerUI").show();
        }
        renderLotteryState();
        renderRoundState();
        renderTickets();
        renderWinningNumbers();
    },
}

// calls the contract getter for reading the round state
function renderRoundState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const rState = await instance.getRoundState({ from: App.account });
            $("#round_state").html('Round active: ' + rState);
            $("#round_state_m").html('Round active: ' + rState);
            App.round_state = rState;
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
function renderLotteryState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const lUp = await instance.lotteryUp();
            App.lotteryUp = lUp;
            $("#lottery_state").html("Lottery up: " + lUp);
            $("#lottery_state_m").html("Lottery up: " + lUp);
            if (lUp) {
                $("#player_lottery").html("Lottery is open");
                $("#home_button").hide();
                $("#enter_lottery").show();
            }
            else {
                $("#player_lottery").html("Lottery is closed");
                $("#home_button").show();
                $("#enter_lottery").hide();
            }
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
function renderTickets() {
    // render number of total tickets 

    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const tickets_num = await instance.getNumTickets({ from: App.account });
            $("#tickets_number").html("Number of total tickets: " + tickets_num);
            $("#tickets_number_m").html("Number of total tickets: " + tickets_num);
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
    //render user tickets
    getTickets(); // get tickets from the contract, and store them in App.tickets
}
function renderWinningNumbers() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const winning_numbers = await instance.getWinningNumbers({ from: App.account });
            $("#winning_numbers").html("Winning numbers: " + winning_numbers);
            $("#winning_numbers_m").html("Winning numbers: " + winning_numbers);
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
// creates the lottery instance
function createLottery() {
    const m = document.getElementById("M").value;
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.createLottery(m, { from: App.account });
            App.lotteryUp = true;
            console.log("lottery up " + App.lotteryUp);
            window.location.replace("lottery.html");
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
function startNewRound() {
    // functions of the contract
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.startNewRound({ from: App.account });
            window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}

function buyTicket() {
    const ticket_string = document.getElementById("input_ticket").value;
    const ticket = ticket_string.split(",").map(Number);
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.buy(ticket, { from: App.account, value: web3.utils.toWei("610000", "gwei") });
            window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}


function drawNumbers() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.drawNumbers({ from: App.account });
            window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();

        }
    });
}
function getTickets() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            let ntckts = await instance.getNumTicketsByPlayer({ from: App.account });
            for (var i = 0; i < ntckts; i++) {
                let ticket = await instance.getTicket(i, { from: App.account });
                $("#tickets_list").append("<li class='list-group-item'>" + ticket + "</li>");
            }
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
// Call init whenever the window loads
window.onload = App.init();