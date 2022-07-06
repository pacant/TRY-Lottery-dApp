App = {
    contracts: {},
    web3Provider: null,
    url: 'http://localhost:8545',
    account: '0x0',
    round_state: false,
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
                ethereum.enable().then(async () => { console.log("DApp connected"); });
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
        });
        return App.selectAccount();
    },
    selectAccount: function () {
        App.contracts["Contract"].deployed().then(async (instance) => {
            const manager = await instance.manager();
            if (manager == App.account) App.manager_account = true;
            else App.manager_account = false;
        });
        return App.render();
    },
    render: function () {
        // render the page
        if (App.manager_account) {
            $("#managerUI").show();
            $("#playerUI").hide();

            App.contracts["Contract"].deployed().then(async (instance) => {

            });
        }
        else {
            // render player page
            $("#managerUI").hide();
            $("#playerUI").show();
        }
        renderRoundState();
    },

    startNewRound: function () {
        // functions of the contract
        App.contracts["Contract"].deployed().then(async (instance) => {
            await instance.startNewRound({ from: App.account });
        });
    },
}

// calls the contract getter for reading the round state
function renderRoundState() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        const rState = await instance.getRoundState({ from: App.account })
        $("#round_state").html('Round active: ' + rState);
        $("#round_state_m").html('Round active: ' + rState);
    });
}

// creates the lottery instance
function createLottery() {
    App.contracts["Contract"].deployed().then(async (instance) => {
        await instance.createLottery({ from: App.account });
    });
}
// Call init whenever the window loads
$(function () {
    $(window).on('load', function () {
        App.init();
    });
});