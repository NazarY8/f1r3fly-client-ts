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
- Get data by channel name
- Listen data on concrete depth by channel name
---

## 📡 gRPC Methods
The client communicates with **F1r3fly** nodes via gRPC methods.

### **lastFinalizedBlock**
Retrieves the last finalized block on the blockchain.
```typescript
const lastBlock = await grpcClient.lastFinalizedBlock();
```

### **doDeploy**
Deploys a Rholang contract to the blockchain.
```typescript
const deployResponse: DeployResponse = await grpcClient.doDeploy(signedDeploy)
```

### **propose**
Proposes a new block containing deployed transactions.
```typescript
const proposeResponse:ProposeResponse = await grpcClient.propose(proposeQuery)
```

### **isFinalized**
Checks if a block has been finalized.
```typescript
const finalizeResponse: IsFinalizedResponse = await grpcClient.isFinalized(finalizeQuery)
```

### **getDataAtName**
Checks if a block has been finalized.
```typescript
const dataAtNameResponse: RhoDataResponse = await grpcClient.getDataAtName(query)
```

### **listenForDataAtName**
Checks if a block has been finalized.
```typescript
const dataAtListenNameResponse: ListeningNameDataResponse = await grpcClient.listenForDataAtName(listenQuery)
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

## How to use client f1r3fly API, code example:
```ts
import {grpcClient, signDeploy, verifyDeploy} from "../grpc/client";
import {DeployDataProto} from "../../generated/CasperMessage_pb.js";
import {ProposeQuery} from "../../generated/ProposeServiceCommon_pb.js";
import {DataAtNameByBlockQuery, DataAtNameQuery, IsFinalizedQuery} from "../../generated/DeployServiceCommon_pb.js";
import {DeployResponse, ListeningNameDataResponse, RhoDataResponse} from "../../generated/DeployServiceV1_pb.js";
import {Expr, Par} from "../../generated/RhoTypes_pb";

(async () => {
    try {
        console.log('🔹 Fetching Last Finalized Block...');
        const lastBlock = await grpcClient.lastFinalizedBlock();
        console.log('✅ Last Finalized Block:', lastBlock.toObject());

        const rholangCode = `@"channelName"!("again hey")| new out(\`rho:io:stdout\`) in { out!("Nodejs deploy test") }`;

        //f1r3fly can return empty response or None.get error if private key is not valid OR if private key is not bonded 
        const privateKey = 'your private key';
        
        const deployData = new DeployDataProto();
        deployData.setTerm(rholangCode);
        deployData.setTimestamp(Date.now());
        deployData.setPhloprice(1);
        deployData.setPhlolimit(50000);
        deployData.setValidafterblocknumber(0);
        deployData.setShardid('root');

        console.log('🟡 Signing Deploy...');
        const signedDeploy: DeployDataProto = signDeploy(privateKey, deployData);
        console.log('✅ SIGNED DEPLOY:', JSON.stringify(signedDeploy, null, 2));

        const isValidDeploy = verifyDeploy(signedDeploy);
        console.log(`✅ DEPLOY IS VALID: ${isValidDeploy ? "✔️" : "❌"}`);

        const deployResponse: DeployResponse = await grpcClient.doDeploy(signedDeploy)

        if (deployResponse.getResult()) {
            console.log("✅ DEPLOY RESPONSE Success!", deployResponse.getResult());
        } else if (deployResponse.getError()) {
            console.error("❌ DEPLOY ERROR:", deployResponse.getError());
            return;
        }

        console.log('🟡 Proposing new block...');

        const proposeQuery = new ProposeQuery();
        const proposeResponse = await grpcClient.propose(proposeQuery)

        console.log("🔹 Full propose response:", proposeResponse.toObject());

        if (proposeResponse.hasError() && Array.isArray(proposeResponse.hasError())) {
            const errorMessage = proposeResponse.hasError()
            console.error("🚨 Propose failed with error:", errorMessage);
            throw new Error(`Propose failed: ${errorMessage}`);
        }

        const proposeRes = proposeResponse.getResult();
        if (!proposeRes || proposeRes.trim() === "") {
            throw new Error("Propose failed: Empty response");
        }

        console.log("✅ PROPOSE RESPONSE", proposeRes);

        const match = proposeRes.match(/Success! Block (\w+) created and added\./);
        if (!match) {
            throw new Error("Propose did not return a valid block hash.");
        }

        const blockHash = match[1];
        console.log("🔹 Extracted block hash:", blockHash);

        const finalizeQuery = new IsFinalizedQuery();
        finalizeQuery.setHash(blockHash);
        const finalizeResponse = await grpcClient.isFinalized(finalizeQuery)

        if (!finalizeResponse.getIsfinalized()) {
            console.log("❌ Deploy is NOT finalized yet.");
            throw new Error(`Block ${blockHash} is not finalized.`);
        }

        console.log("🚀 ✅ Deploy is finalized! 🚀");


        // TODO HOW TO FETCH SOME DATA BY CHANNEL NAME (needed concrete block)
        const par = new Par;
        const expr = new Expr();
        expr.setGString('channelName');

        par.addExprs(expr)
        var query = new DataAtNameByBlockQuery();
        query.setPar(par)
        query.setBlockhash(blockHash)
        query.setUseprestatehash(false)

        console.log("🔹 Query structure:", JSON.stringify(query.toObject(), null, 2));

        const dataAtNameResponse: RhoDataResponse = await grpcClient.getDataAtName(query)

        if (dataAtNameResponse.hasError()) {
            console.error("❌ Error fetching data at name:", dataAtNameResponse.getError()?.toObject());
        } else {
            console.log("✅ All data from channel", dataAtNameResponse.getPayload()?.getParList().map((par) => par.toObject()))
            var dataFromChannel = dataAtNameResponse.getPayload()?.getParList() || [];
            console.log("✅ Last messages:", extractGStringFromParList(dataFromChannel));
        }

        //TODO how to fetch data without block
        var listenQuery = new DataAtNameQuery()
        listenQuery.setDepth(10)
        listenQuery.setName(par)

        const dataAtListenNameResponse: ListeningNameDataResponse = await grpcClient.listenForDataAtName(listenQuery)

        if (dataAtListenNameResponse.hasError()) {
            console.error("❌ Error fetching data at listen name:", dataAtNameResponse.getError()?.toObject());
        } else {
            var listenDataFromChannel = dataAtListenNameResponse.getPayload()?.getBlockinfoList().at(0)?.getPostblockdataList() || []
            console.log("✅ Listen data by depth: ", extractGStringFromParList(listenDataFromChannel))
        }

        function extractGStringFromParList(parList: Array<Par>) {
            return parList.map((par) => par.toObject()).map((x) => x.exprsList.map((e) => e.gString))
        }

    } catch (error) {
        console.error('❌ gRPC Error:', error);
    }
})();

```

