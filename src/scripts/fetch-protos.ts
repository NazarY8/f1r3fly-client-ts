import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROTO_DIR = path.join(process.cwd(), 'src/protos');
const SCALAPB_DIR = path.join(PROTO_DIR, 'scalapb');

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/F1R3FLY-io/f1r3fly/main/models/src/main/protobuf';

const PROTO_FILES = [
    'DeployServiceV1.proto',
    'DeployServiceCommon.proto',
    'ProposeServiceV1.proto',
    'ProposeServiceCommon.proto',
    'ServiceError.proto',
    'RhoTypes.proto',
    'CasperMessage.proto',
];

const SCALAPB_PROTO = {
    url: 'https://raw.githubusercontent.com/scalapb/ScalaPB/master/protobuf/scalapb/scalapb.proto',
    path: path.join(SCALAPB_DIR, 'scalapb.proto'),
};

const downloadProto = (filename: string) => {
    const url = `${GITHUB_RAW_BASE}/${filename}`;
    const filePath = path.join(PROTO_DIR, filename);
    console.log(`🔹 Downloading ${filename}...`);
    execSync(`curl -s ${url} -o ${filePath}`);
};

const downloadScalapbProto = () => {
    if (!fs.existsSync(SCALAPB_DIR)) fs.mkdirSync(SCALAPB_DIR, { recursive: true });
    console.log(`🔹 Downloading scalapb.proto...`);
    execSync(`curl -s ${SCALAPB_PROTO.url} -o ${SCALAPB_PROTO.path}`);
};

const main = () => {
    if (!fs.existsSync(PROTO_DIR)) fs.mkdirSync(PROTO_DIR, { recursive: true });
    PROTO_FILES.forEach(downloadProto);
    downloadScalapbProto();
    console.log('✅ All proto files downloaded.');
};

main();
