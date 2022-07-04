App = {
    contracts: {},
    web3Provider: null,
    url: 'http://localhost:8545',
    account: '0x0',
    // Store contract abstractions
    // Web3 provider
    // Url for web3
    // current ethereum account
    init: function () { return App.initWeb3(); },

    initWeb3: function () {
        if (typeof web3 != 'undefined') { // Check whether exists a provider, e.g Metamask
            App.web3Provider = window.ethereum; // standard since 2/11/18
            web3 = new Web3(App.web3Provider);
            try { // Permission popup
                ethereum.enable().then(async () => { console.log("DApp connected"); });
            }
            catch (error) { console.log(error); }
        } else { // Otherwise, create a new local instance of Web3
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
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
        });
        return App.render();
    },

    render: function () {
        // render the page
    },

    startNewRound: function () {
        // functions of the contract
        App.contracts["Contract"].deployed().then(async (instance) => {
            await instance.startNewRound({ from: App.account });
        });
    }
}
// Call init whenever the window loads
$(function () {
    $(window).on('load', function () {
        App.init();
    });
});