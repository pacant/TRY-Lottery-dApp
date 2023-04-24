App = {
    contracts: {},
    web3Provider: null,
    url: 'http://localhost:8545',
    account: '0x0',
    manager_account: false,
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
                if (!App.manager_account) {
                    if (event.returnValues.round_state) alert("Round started");
                    else alert("Round closed");
                    window.location.reload();
                }
            });

            instance.LotteryCreated().on('data', function (event) {
                if (!App.manager_account) {
                    alert("Lottery open");
                    window.location.reload();
                }
            });
            instance.LotteryClosed().on('data', function (event) {
                if (!App.manager_account) {
                    alert("Lottery closed");
                    window.location.reload();
                }
            });
            instance.WinningTicket().on('data', function (event) {
                if (!App.manager_account) {
                    alert("Winning ticket: " + event.returnValues._ticket);
                    window.location.reload();
                }
            });
            // winners event
            instance.Prize().on('data', function (event) {
                if (event.returnValues.addr.toLowerCase() == App.account) {
                    alert("YOU WON a NFT of class " + event.returnValues.class + ". TokenID = " + event.returnValues.token);
                    window.location.reload();
                }
                else {
                    alert("User " + event.returnValues.addr + " won a NFT of class " + event.returnValues.class);

                }
            });
            instance.Revenues().on('data', function (event) {
                if (App.manager_account) {
                    alert("Withdraw: " + event.returnValues.balance + " wei");
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

    // detect if manager account or not
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

    // render the interface
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
        renderPrize();
    },
}

// calls the contract getter for reading the round state
function renderRoundState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const rState = await instance.getRoundState({ from: App.account });
            if (rState == 0) { // wating for the start of new round
                $("#round_state").html('Round: ' + "finished");
                $("#round_state_m").html('Round: ' + "finished");
            }
            else if (rState == 1) { // user can buy ticket
                $("#round_state").html('Round: ' + "active");
                $("#round_state_m").html('Round: ' + "active");
            }
            else { // user can't buy ticket, waiting for draw and giveprizes
                $("#round_state").html('Round: ' + "unactive");
                $("#round_state_m").html('Round: ' + "unactive");
            }
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}

// calls the contract getter for reading the lottery state
function renderLotteryState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const lUp = await instance.lotteryUp();
            if (lUp) {
                $("#lottery_state").html("Lottery: open");
                $("#lottery_state_m").html("Lottery: open");
                $("#player_lottery").html("Lottery is open");
                $("#home_button").hide();
                $("#enter_lottery").show();
            }
            else {
                $("#lottery_state").html("Lottery state: closed");
                $("#lottery_state_m").html("Lottery state: closed");
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
// // calls the contract getter for reading the number of total tickets 
function renderTickets() {

    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            const m = await instance.getM({ from: App.account });
            const tickets_num = await instance.getNumTickets({ from: App.account });
            $("#tickets_number").html("Number of total tickets: " + tickets_num + " / " + m);
            $("#tickets_number_m").html("Number of total tickets: " + tickets_num + " / " + m);
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
    //render single user tickets
    getTickets();
}
// calls the contract getter for reading the winning ticket
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
// calls the contract getter for reading the user prizes (the images    )
// same mechanism of retrieving tickets! 
function renderPrize() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            let nPrizes = await instance.getNumPrizes({ from: App.account });
            for (var i = 0; i < nPrizes; i++) {
                let result = await instance.getPrizes(i, { from: App.account });
                $("#prizes").append("<li style='display: inline;class='list-group-item'><img style='max-height:200px;' src=" + result + "></li>");
            }
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
            if (App.manager_account) window.location.replace("lottery.html");
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();

        }
    });
}
// start a new round
function startNewRound() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.startNewRound({ from: App.account });
            if (App.manager_account) window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
// buy the ticket for the user
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
// selecting winners according to winning ticket
function givePrizes() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.givePrizes({ from: App.account });
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
// extracting the winning ticket
function drawNumbers() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.drawNumbers({ from: App.account });
            if (App.manager_account) window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();

        }
    });
}
// get tickets for that specific user:
// first it retrieves the number of ticket that the user has, and then for each one retrieves that single ticket and appends it to the list
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
// close the lottery
function closeLottery() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.closeLottery({ from: App.account });
            if (App.manager_account) window.location.reload();
        }
        catch (error) {
            console.log(error.message);
            $('#error').html(error.message);
            $('#error').show().delay(5000).fadeOut();
        }
    });
}
// manager withdraw the revenues
function withdraw() {

    App.contracts["Contract"].deployed().then(async (instance) => {
        try {
            await instance.withdraw(App.account, { from: App.account });
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
