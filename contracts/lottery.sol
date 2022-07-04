//SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

import "./Cryptoducks.sol";

contract LotteryTry{
    address manager; 

    struct Round{
        bool active;
        bool finished;
    }

    struct Player{
        address addr;
        uint[6] ticket;
    }

    uint firstBlock;
    uint M;

    event Ticket(uint[6] _ticket);
    event Prize(address addr, string uri,uint class);
    event Revenues(uint balance);
    event Players(Player[] players);

    Player[] players;
    Round round;
    
    bool lotteryUp;
    uint[6] winnerNumbers;
    uint tokenIdCounter;

    address DKSAddress;


    struct DKStoken{
        uint tokenId;
        string uri;
        bool assigned;
    }
    mapping(uint => DKStoken) DKSuri; // mapping from nft class to uri-id

    /*
    Set the lottery manager at contract creation. Takes M and the address of NFT contract as arguments
    */
    constructor(uint m,address addr){
        manager = msg.sender;
        round=Round(false,true);
        M = m;
        DKSAddress = addr;
        lotteryUp = true;
    }

    /*
    modifier for function that can be called only by the manager
    */
    modifier onlyManager(){
        require(msg.sender == manager); 
        _;
    }

    /*
    checks if the previous round is finished, and, if that's the case, starts a new round.
    takes M as argument.
    */
    function startNewRound() public onlyManager{
        require(lotteryUp, "Lottery closed!");
        require(round.finished,"round is already started");
        round.finished = false;
        round.active = true;
        firstBlock = block.number;
    }

    /*
    Function for buying a ticket, takes a uint[] array with 6 elements as argument. 
    The flast one is the powerball.
        ex buy([63,24,32,12,69,1])
    Round should be active
    Lottery ticket numbers required in a range from 1 to 69
    Lottery ticket price required: 0,00061 ether =  610'000 gwei = around 1 euro
    */
    function buy(uint[6] memory ticket) payable public{
        require(lotteryUp, "Lottery closed!");
        require(ticket.length == 6,"choose 6 numbers!");
        require(round.active,"round not active");
        bool success = true;
        // check if M blocks has passed
        if(block.number - firstBlock >= M){
            round.active = false;
            if(block.number - firstBlock > M) success = false;
        }
        for(uint i = 0; i < ticket.length-1; i++){
            require(ticket[i] > 0 && ticket[i] < 70,"choose numbers between 1 and 69");
        }
        require(ticket[ticket.length-1] > 0 && ticket[ticket.length-1] < 27,"choose powerball between 1 and 26");
        require(msg.value == 610000 gwei,"a ticket costs 610'000 gwei");
        
        if(success){
            Player memory player = Player(msg.sender,ticket);
            players.push(player);
            emit Ticket(ticket);
            emit Players(players);
        }
        
    }
    /*
    Aux function that generate a random uint in a range, hashing difficulty and timestamp of the block.
        ex. random(99) generate a number from 1 to 99
    */
    function random(uint range,uint seed) private view returns(uint){
        return (uint(keccak256(abi.encode(block.timestamp,seed))) % range)+1;
    }

    /*
    draw 6 different winning numbers with random function.
    */
    function drawNumbers() public onlyManager{
        require(lotteryUp, "Lottery closed!");
        require(!round.active,"round is still active!");
        require(!round.finished, "round finished");
        for(uint i = 0 ;i < 6; i++){
            do{ 
                if(i!=5) winnerNumbers[i] = random(69,i+players.length);
                else winnerNumbers[i] = random(26,i+players.length);
            }
           while(checkDuplicates(winnerNumbers[i],winnerNumbers,i)); // i don't want duplicates
        }
        emit Ticket(winnerNumbers);
    }
    
    /*
    Check if a number is a duplicate in an array
    */
    function checkDuplicates(uint check, uint[6] memory array,uint index) private pure returns(bool){
        for(uint i = 0; i < index; i++){
            if(check == array[i]) return true;
        }
        return false;
    }


    // distribute the prizes
    function givePrizes() public onlyManager{
        require(lotteryUp, "Lottery closed!");
        require(!round.active,"round still active");
        require(!round.finished, "round finished");
        bool powerball;
        uint commonElements;
        for(uint i = 0; i < players.length; i++){
            powerball = false;
            uint class=0;
            if(winnerNumbers[5] == players[i].ticket[5]) powerball = true;
            commonElements = findCommonElements(winnerNumbers,players[i].ticket);

            if(powerball && commonElements == 0){ // class 8
                class = 8;
            }
            else if(commonElements == 1 && !powerball){ // class 7
                class = 7;
            }
            else if((commonElements == 1 && powerball) || (commonElements == 2 && !powerball)){ // class 6
                class = 6;
            }
            else if((commonElements == 2 && powerball) || (commonElements == 3 && !powerball)){ // class 5
                class = 5;
            }
            else if((commonElements == 3 && powerball) || (commonElements == 4 && !powerball)){ // class 4
                class = 4;
            }
            else if(commonElements == 4 && powerball){ // class 3
                class = 3;
            }
            else if(commonElements == 5 && !powerball){ //class 2
                class = 2;
            }
            else if(commonElements == 5 && powerball){ // class 1 
                class = 1;
            }
            if(class != 0){
                if(DKSuri[class].assigned){
                    mintOnDemand(players[i].addr,tokenIdCounter,DKSuri[class].uri); // mint
                    tokenIdCounter++;
                }
                else{
                    transferDKS(players[i].addr,DKSuri[class].tokenId);
                    DKSuri[class].assigned = true;
                 } //transfer and flag assigned
                 emit Prize(players[i].addr,DKSuri[class].uri,class);
            }
        }
        round.finished = true; // end the round
        delete players; // clear players array
    }

    /*
    aux function for finding common elements between two arrays
    */
    function findCommonElements(uint[6] memory array, uint[6] memory ticket) private pure returns(uint){
        uint commonElements = 0;
        for(uint i=0;i < array.length-1; i++){
            for(uint j=1; j < ticket.length; j++){
                if(array[i] == ticket[j]){
                    commonElements++;
                    continue;
                }
            }
        }
        return commonElements;
    }

    /*
    Function to withdraw the revenue of the tickets
    */
    function withdraw(address addr) public onlyManager{
        emit Revenues(address(this).balance);
        payable(addr).transfer(address(this).balance);
    }
    /*
    End the round and reset data structures
    */
    /*
    deactivate the lottery contract
    */
    function closeLottery() public onlyManager{
        if(!round.finished){
            for(uint i = 0; i < players.length; i++){
                payable(players[i].addr).transfer(0.0056 ether);
            }
        }
        lotteryUp = false;

    }

    /*
    Function to mint an NFT, calling Cryptoducks.sol mint function. Only the creator of 
    cryptoduck can mint an NFT,and only the manager of the lottery can use 
    this function. So they are the same person. When you mint a Cryptoduck, you have to specify;

    -address of the nft contract
    -owner of the minted nft
    -unique token id (START FROM 1)
    -uri of an img or a description
    -class (from 1 to 8)

    */
    function mintDKS(address _to, uint256 _tokenId, string memory _uri,uint class) public onlyManager{
        tokenIdCounter=_tokenId+1;
        Cryptoducks DKS = Cryptoducks(DKSAddress);
        DKS.mint(_to,_tokenId,_uri);
        DKStoken memory temp = DKStoken(_tokenId,_uri,false);
        DKSuri[class] = temp;
    }

    /*
    function for minting an NFT during the lottery, if there are more winners than the available prizes
    */
    function mintOnDemand(address _to, uint256 _tokenId, string memory _uri) private{
        Cryptoducks DKS = Cryptoducks(DKSAddress);
        DKS.mint(_to,_tokenId,_uri);
    }

    /*
    function for transfer NFT
    */
    function transferDKS(address _to, uint256 _tokenId) private{
        Cryptoducks DKS = Cryptoducks(DKSAddress);
        DKS.transfer(manager,_to,_tokenId);
    }
    /*


    */

}