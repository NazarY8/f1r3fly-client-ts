# F1r3fly TypeScript gRPC Client

This project is a TypeScript-based gRPC client for interacting with the **F1r3fly** network. It enables users to deploy and propose Rholang smart contracts on the **F1r3fly** blockchain using gRPC communication.

## 🚀 Features
- Fetching protobuf (`.proto`) files from the official F1r3fly repository.
- Generating gRPC client stubs.
- Signing and verifying deploys using **secp256k1**.
- Communicating with **F1r3fly** blockchain nodes using **gRPC**.
- Executing transactions and monitoring their status.

## 🛠️ Technologies Used
- **TypeScript**
- **gRPC & Protocol Buffers**
- **elliptic (secp256k1 crypto)**
- **blakejs (Blake2b hashing)**
- **Google Protocol Buffers (protobufjs)**
- **gRPC tools for TypeScript**

---

## 📥 Installation

Clone the repository and install dependencies:
```sh
# Clone the repository
$ git clone ...
$ cd f1r3fly-client-ts

# Install dependencies
$ npm install
```

---

## 🔄 Workflow
The client follows a structured workflow to interact with **F1r3fly** nodes.

### 1️⃣ Fetch Protobuf Files
Retrieve the latest **.proto** definitions from the F1r3fly repository:
```sh
npm run fetch-protos
```

### 2️⃣ Generate gRPC Client Stubs
Compile the protobuf files into TypeScript gRPC stubs:
```sh
npm run generate-grpc
```

### 3️⃣ Deploy a Rholang Smart Contract
To deploy a Rholang contract and propose a new block, run:
```sh
npm run f1r3fly-call
```

This executes `test-grpc.ts`, which performs the following:
- Fetches the last finalized block.
- Signs and sends a deploy to the **F1r3fly** network.
- Proposes a new block to include the deploy.
- Checks if the deploy is finalized.

---

## 📡 gRPC Methods
The client communicates with **F1r3fly** nodes via gRPC methods.

### **lastFinalizedBlock**
Retrieves the last finalized block on the blockchain.
```typescript
const lastBlock = await grpcClient.lastFinalizedBlock();
console.log('✅ Last Finalized Block:', lastBlock);
```

### **doDeploy**
Deploys a Rholang contract to the blockchain.
```typescript
const signedDeploy = signDeploy(privateKey, deployData);
const deployResponse = await grpcClient.doDeploy(signedDeploy);
```

### **propose**
Proposes a new block containing deployed transactions.
```typescript
const proposeResponse = await grpcClient.propose();
```

### **isFinalized**
Checks if a block has been finalized.
```typescript
const finalizeResponse = await grpcClient.isFinalized({ hash: blockHash });
```

---

## 📄 Example Rholang Smart Contract
The client deploys the following **Hello World** contract:
```rholang
new helloWorld, stdout(`rho:io:stdout`), stdoutAck(`rho:io:stdoutAck`) in {
  contract helloWorld(@name) = {
    new ack in {
      stdoutAck!("Hello, ", *ack) |
      for (_ <- ack) {
        stdoutAck!(name, *ack) |
        for (_ <- ack) {
          stdout!("\n")
        }
      }
    }
  } |
  helloWorld!("World!")
}
```

This contract prints **"Hello, World!"** when executed. 
BTW, this is just an example, you can always change the example of a contract or other settings in test-grpc.ts 
---

## 📜 Project Structure
```
├── src/
│   ├── grpc/
│   │   ├── client.ts       # gRPC client implementation
│   ├── scripts/
│   │   ├── fetch-protos.ts  # Fetches .proto files
│   │   ├── generate-grpc.ts # Generates gRPC stubs
│   │   ├── test-grpc.ts     # Runs a deploy test
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
```

---

## 🔥 Conclusion
This client provides an efficient way to deploy, propose, and finalize Rholang smart contracts on the **F1r3fly** network. By using TypeScript and gRPC, it ensures high-performance blockchain interaction with cryptographic security.

Enjoy building on F1r3fly! 🚀

