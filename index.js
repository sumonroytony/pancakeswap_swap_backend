'use strict';
const env = require('dotenv');
const ethers = require('ethers');
const pcsAbi = new ethers.utils.Interface(require('./abi.json'));
const erc20Abi = new ethers.utils.Interface(require('./erc20Abi.json'));
const express = require('express');
const app = express();
env.config();

const tokens = {
  // router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', //mainnet
  router: '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3', //testnet
  purchaseAmount: process.env.PURCHASEAMOUNT || '0.01',
  // pair: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'],//mainnet
  pair: ['0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'], //testnet
  GASLIMIT: process.env.GASLIMIT || '210000',
  gasPrice: process.env.GASPRICE || '5',
  deadline: 60,
};

const GLOBAL_CONFIG = {
  BSC_NODE: process.env.BSC_NODE || 'wss://bsc-ws-node.nariox.org:443',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RECIPIENT: process.env.RECIPIENT,
};

const provider = new ethers.providers.JsonRpcProvider(GLOBAL_CONFIG.BSC_NODE);
const wallet = new ethers.Wallet(GLOBAL_CONFIG.PRIVATE_KEY);
const signer = new ethers.Wallet(GLOBAL_CONFIG.PRIVATE_KEY, provider);
const account = wallet.connect(provider);
const router = new ethers.Contract(tokens.router, pcsAbi, account);

app.get('/buy/:token', async (req, res) => {
  try {
    const tokenToBuy = req.params.token;
    const amountOutMin = 0;
    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      [tokens.pair[0], tokenToBuy],
      process.env.RECIPIENT,
      Date.now() + 1000 * tokens.deadline,
      {
        value: ethers.utils.parseUnits(tokens.purchaseAmount, 18),
        gasLimit: tokens.GASLIMIT,
        gasPrice: ethers.utils.parseUnits(tokens.gasPrice, 'gwei'),
      }
    );
    tx.wait();
    res.json({ tx });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

//get request with params for sell token
app.get('/sell/:token', async (req, res) => {
  try {
    const amountOutMin = 0;
    const tokenToSell = req.params.token;
    const contract = new ethers.Contract(tokenToSell, erc20Abi, provider);
    const contract2 = new ethers.Contract(tokenToSell, erc20Abi, signer);
    const balance = (
      await contract.balanceOf(process.env.RECIPIENT)
    ).toString();
    const amountIn = balance;
    const approve = await contract2.approve(tokens.router, amountIn);
    const tx =
      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        amountOutMin,
        [tokenToSell, tokens.pair[0]],
        process.env.RECIPIENT,
        Date.now() + 1000 * tokens.deadline
      );
    tx.wait();
    res.json({ tx });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

//get request for account balance
app.get('/balance/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const contract = new ethers.Contract(token, erc20Abi, provider);
    const balance = (
      await contract.balanceOf(process.env.RECIPIENT)
    ).toString();
    console.log({ balance });
    res.json(ethers.utils.formatUnits(balance, balance.decimals));
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

app.listen(5000, () => {
  console.log('Server started on port 5000');
});
// startConnection();
