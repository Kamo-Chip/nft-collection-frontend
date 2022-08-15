import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Contract, ethers, providers, utils } from "ethers";
import { useRef, useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { abi, cryptoDevsContractAddress } from "../constants/index";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenIdsMinted, setTokenIdsMinted] = useState(0);

  const web3Modal = useRef();

  const getSignerOrProvider = async (needSigner = false) => {
    const provider = await web3Modal.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const presaleMint = async () => {
    try {
      const signer = await getSignerOrProvider(true);
      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        signer
      );

      const tx = await cryptoDevContract.presaleMint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait(1);
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev");
    } catch (err) {
      console.error(err);
    }
  };

  const publicMint = async () => {
    try {
      const signer = await getSignerOrProvider(true);
      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        signer
      );

      const tx = await cryptoDevContract.mint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait(1);
      setLoading(false);

      window.alert("You successfully minted a Crypto Dev");
    } catch (err) {
      console.error(err);
    }
  };

  const connectWallet = async () => {
    try {
      await getSignerOrProvider();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const startPresale = async () => {
    try {
      const signer = await getSignerOrProvider(true);

      const cryptoDevsContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        signer
      );

      const tx = await cryptoDevsContract.startPresale();
      setLoading(true);
      await tx.wait(1);
      setLoading(false);

      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfPresaleStarted = async () => {
    try {
      const provider = await getSignerOrProvider();

      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        provider
      );

      const _presaleStarted = await cryptoDevContract.presaleStarted();

      if (!_presaleStarted) {
        await getOwner();
      }

      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getSignerOrProvider();

      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        provider
      );

      const _presaleEnded = await cryptoDevContract.presaleEnded();

      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));

      setPresaleEnded(hasEnded);

      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const getOwner = async () => {
    try {
      const provider = await getSignerOrProvider();
      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        provider
      );

      const _owner = await cryptoDevContract.owner();

      const signer = await getSignerOrProvider(true);

      const address = await signer.getAddress();

      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTokenIdsMinted = async () => {
    try {
      const provider = await getSignerOrProvider();

      const cryptoDevContract = new Contract(
        cryptoDevsContractAddress,
        abi,
        provider
      );

      const _tokenIdsMinted = await cryptoDevContract.tokenIds();

      setTokenIdsMinted(ethers.BigNumber.from(_tokenIdsMinted).toNumber());
      console.log(tokenIdsMinted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      web3Modal.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      const presaleEndedInterval = setInterval(async () => {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      setInterval(async () => {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasn't started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
