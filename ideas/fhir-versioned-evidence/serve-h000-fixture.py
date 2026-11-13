"""Isolated, local public-research fixture; use only on an owned runtime."""
import argparse, base64, hmac, json, os, secrets
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('root',type=Path,help='Previously generated new fixture directory')
args=parser.parse_args()
root=args.root.resolve(strict=True)
data=(root/'http-fixture').resolve(strict=True)
pins=json.loads((root/'http-pins.json').read_text(encoding='utf8'))
private=root/'private'
private.mkdir(mode=0o700)
auth=('synthetic-reader:'+secrets.token_urlsafe(32)).encode()
fd=os.open(private/'reader.json',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w',encoding='utf8') as out:
    name,password=auth.decode().split(':',1)
    json.dump({'username':name,'password':password},out)
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        expected='Basic '+base64.b64encode(auth).decode('ascii')
        if not hmac.compare_digest(self.headers.get('Authorization',''),expected):
            self.send_response(401);self.send_header('WWW-Authenticate','Basic realm="research-fixture"');self.end_headers();return
        if self.path not in pins:
            self.send_error(404);return
        target=(data/self.path.lstrip('/')).resolve()
        if data not in target.parents or not target.is_file():
            self.send_error(404);return
        payload=target.read_bytes()
        self.send_response(200);self.send_header('Content-Type','application/fhir+json');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
HTTPServer(('127.0.0.1',18136),Handler).serve_forever()
