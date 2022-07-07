App = {
    contracts: {},
    web3Provider: null,
    url: 'http://localhost:8545',
    account: '0x0',
    round_state: false,
    manager_account: false,
    lotteryUp: false,
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
                $('#round_state').html('Round active: ' + event.returnValues.round_state); // implement it in html

                console.log("Event RoundState");
            });

            instance.WinningTicket().on('data', function (event) {
                $('#winning_ticket').html('Winning ticket: ' + event.returnValues._ticket);

                console.log("Event WinningTicket");
            });

            instance.LotteryCreated().on('data', function (event) {
                if (!App.manager_account) {
                    alert("Lottery created");
                    App.lotteryUp = true;
                    window.location.replace("lottery.html");
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
                console.log("is manager");
                App.manager_account = true;
            }
            else {
                console.log("is not manager");
                App.manager_account = false;
            }
            console.log("changing manager to " + App.manager_account);
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
        renderRoundState();
        renderLotteryState();

    },
}

// calls the contract getter for reading the round state
function renderRoundState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        const rState = await instance.getRoundState({ from: App.account });
        $("#round_state").html('Round active: ' + rState);
        $("#round_state_m").html('Round active: ' + rState);
    });
}
function renderLotteryState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
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
            console.log("rendering...")
        }
    });
}

// creates the lottery instance
function createLottery() {
    try {
        App.contracts["Contract"].deployed().then(async (instance) => {
            await instance.createLottery(2, { from: App.account });
            App.lotteryUp = true;
            console.log("lottery up " + App.lotteryUp);
            window.location.replace("lottery.html");
        });
    }
    catch (error) {
        console.log(error);
    }
}
function startNewRound() {
    // functions of the contract
    App.contracts["Contract"].deployed().then(async (instance) => {
        await instance.startNewRound({ from: App.account });
        window.location.reload();
    });
}
// Call init whenever the window loads
window.onload = App.init();