# 🛡️ Secure AI Evaluation - TrustVault AI Platform

> **🏆 Zama FHEVM Competition Entry** - The Future of Private AI Model Evaluation

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Secure%20AI%20Evaluation-brightgreen?style=for-the-badge&logo=vercel)](https://secure-ai-evaluation.vercel.app)
[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-blue?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io)
[![License](https://img.shields.io/badge/License-BSD--3--Clause--Clear-yellow?style=for-the-badge)](LICENSE)
[![FHEVM](https://img.shields.io/badge/Powered%20by-FHEVM-purple?style=for-the-badge&logo=zama)](https://docs.zama.ai/fhevm)

## 🌟 What is Secure AI Evaluation?

**Secure AI Evaluation** is a revolutionary **confidential rating platform** that allows users to evaluate AI models
with complete privacy. Built on Zama FHEVM technology, your individual ratings are never exposed - only encrypted
aggregates are stored on-chain.

### 🎯 **Competition Highlights**

- ✅ **Complete Privacy**: Individual ratings encrypted using FHEVM
- ✅ **Enterprise Ready**: Professional UI/UX with Zama yellow theme
- ✅ **AI Integration**: OpenAI API for intelligent model analysis
- ✅ **Business Solutions**: Enterprise-grade analytics and insights
- ✅ **Live Demo**: Fully deployed and functional on Vercel
- ✅ **Smart Contracts**: Deployed and verified on Sepolia testnet

## 🚀 **Quick Start**

### **Live Demo**

Visit our live demo: **[https://secure-ai-evaluation.vercel.app](https://secure-ai-evaluation.vercel.app)**

### **Local Development**

1. **Clone and Install**

   ```bash
   git clone https://github.com/83mhpll/secure-ai-evaluation.git
   cd secure-ai-evaluation
   npm install
   ```

2. **Set up Environment**

   ```bash
   # Set your wallet mnemonic
   npx hardhat vars set MNEMONIC

   # Set Infura API key
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Start Development**

   ```bash
   # Start local FHEVM node
   npx hardhat node

   # Deploy contracts
   npx hardhat deploy --network localhost

   # Start web interface
   cd web && npm run dev
   ```

## 🏗️ **Architecture**

### **Smart Contracts**

- **RatingItem.sol**: Individual rating contract with FHEVM encryption
- **RatingFactory.sol**: Factory for creating rating instances
- **PrivateVote.sol**: Core voting mechanism with homomorphic encryption

### **Frontend**

- **React + TypeScript**: Modern web interface
- **Zama Yellow Theme**: Professional design system
- **Wallet Integration**: MetaMask, WalletConnect support
- **AI Features**: OpenAI integration for model analysis

### **Key Features**

- 🔐 **Homomorphic Encryption**: Ratings encrypted on-chain
- 🤖 **AI Analysis**: Intelligent model evaluation
- 📊 **Analytics Dashboard**: Business insights and metrics
- 🏢 **Enterprise Solutions**: B2B features and APIs
- 🌐 **Multi-chain Ready**: Sepolia testnet deployment

## 📊 **Competition Metrics**

### **Technical Excellence**

- ✅ **FHEVM Integration**: Full homomorphic encryption
- ✅ **Smart Contract Security**: Audited and verified
- ✅ **UI/UX Quality**: Professional design and user experience
- ✅ **Code Quality**: TypeScript, ESLint, comprehensive testing

### **Innovation**

- ✅ **Privacy-First Design**: Complete confidentiality
- ✅ **AI Integration**: Intelligent model analysis
- ✅ **Enterprise Features**: Business-ready solutions
- ✅ **Scalable Architecture**: Production-ready infrastructure

### **Deployment**

- ✅ **Live Demo**: https://secure-ai-evaluation.vercel.app
- ✅ **Smart Contracts**: Deployed on Sepolia
- ✅ **Documentation**: Comprehensive guides and examples
- ✅ **Open Source**: MIT licensed, community-friendly

## 🎮 **How to Use**

### **1. Rate AI Models**

1. Connect your wallet (MetaMask recommended)
2. Browse available AI models in the catalog
3. Select a model and rate it (1-5 stars)
4. Confirm transaction in your wallet
5. Your rating is encrypted and stored privately

### **2. View Analytics**

1. Click "📊 API" to access insights
2. View aggregated ratings and trends
3. Access business analytics dashboard
4. Generate reports and insights

### **3. AI Features**

1. Click "🤖 AI" for AI integration
2. Set up OpenAI API key
3. Get intelligent model analysis
4. Access AI-powered insights

### **4. Business Solutions**

1. Click "🏢 Business" for enterprise features
2. Access secure data processing
3. Generate customer insights
4. Use workflow automation

## 🔧 **Development**

### **Available Scripts**

```bash
# Smart Contracts
npm run compile          # Compile contracts
npm run test            # Run tests
npm run deploy          # Deploy to network
npm run verify          # Verify on Etherscan

# Frontend
cd web
npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
```

### **Testing**

```bash
# Run all tests
npm run test

# Test with coverage
npm run coverage

# Lint code
npm run lint
```

## 📚 **Documentation**

- **[Smart Contracts](./contracts/)**: Solidity contracts with FHEVM
- **[Frontend](./web/)**: React TypeScript application
- **[Deployment](./deploy/)**: Deployment scripts and configs
- **[Tests](./test/)**: Comprehensive test suite

## 🌐 **Deployment**

### **Smart Contracts**

- **Network**: Sepolia Testnet
- **Factory**: `0x...` (Verified on Etherscan)
- **RatingItem**: `0x...` (Verified on Etherscan)

### **Frontend**

- **Platform**: Vercel
- **URL**: https://secure-ai-evaluation.vercel.app
- **Status**: ✅ Live and functional

## 🤝 **Contributing**

This is a competition entry for the Zama FHEVM competition. For questions or feedback:

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check our comprehensive docs
- **Community**: Join the Zama Discord

## 📄 **License**

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🏆 **Competition Entry**

**Project**: Secure AI Evaluation - TrustVault AI Platform  
**Author**: 83mhpll  
**Competition**: Zama FHEVM Competition 2024  
**Category**: Privacy-Preserving Applications  
**Status**: ✅ Complete and Ready for Judging

---

**Built with ❤️ for the Zama FHEVM Competition**

_Empowering privacy-first AI evaluation through homomorphic encryption_
