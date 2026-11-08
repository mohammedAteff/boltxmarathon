// Run against a local server configured with a disposable *_test database and a share key.
import assert from 'node:assert/strict';

const base=new URL(process.env.BOLTX_TEST_URL||'http://127.0.0.1:8018/boltxmarathon/');
assert(['127.0.0.1','localhost'].includes(base.hostname),'Use a local test server');
const tag=Date.now().toString(36), password='local-test-password';
function browser(){
    let cookie='', csrf='';
    async function req(path,options={}){
        const response=await fetch(new URL(path,base),{redirect:'manual',...options,headers:{Cookie:cookie,...options.headers}});
        const newCookie=response.headers.getSetCookie().at(-1);
        if(newCookie) cookie=newCookie.split(';')[0];
        const body=await response.text();
        const token=body.match(/(?:name="csrf" value=|data-csrf=)"([a-f0-9]+)"/);
        if(token) csrf=token[1];
        const status=response.status;
        const location=response.headers.get('location');
        return {status,location,body,json:response.headers.get('content-type')?.includes('application/json')?JSON.parse(body):null};
    }
    const form=(path,data)=>req(path,{method:'POST',body:new URLSearchParams({csrf,...data})});
    const api=(query)=>req('api.php?'+query);
    const act=(data)=>req('api.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
    return {req,form,api,act};
}
function status(result,expected){
    assert.equal(result.status,expected,JSON.stringify(result).slice(0,800));
    return result;
}
async function register(client,label,intent){
    const path='auth/account.php?mode=register&create='+intent;
    const email=label+tag+'@example.test';
    status(await client.req(path),200);
    const result=status(await client.form(path,{name:'Tester '+label,email,password,confirm_password:password,role:'admin'}),303);
    assert.equal(result.location,'../my/?tab='+intent+'&create=1');
    assert.match(status(await client.req('my/?tab='+intent+'&create=1'),200).body,/My Challenges/);
    return email;
}
const a=browser(), b=browser(), guest=browser(), operator=browser();
const email=await register(a,'a','wheel');
const wheel=status(await a.act({action:'game_create',kind:'wheel',name:'Wheel '+tag,role:'view',initial_players:'A',initial_items:'Joke'}),200).json;
const boxes=status(await a.act({action:'game_create',kind:'boxes',name:'Boxes '+tag,role:'play',initial_boxes:'Sing'}),200).json;
const mine=status(await a.api('view=mine'),200).json;
assert.deepEqual(mine.games.map(x=>x.id),[wheel.game,boxes.game]);
assert.deepEqual(status(await a.api('view=share&game='+wheel.game),200).json.credentials.code,wheel.code);
assert.equal(status(await guest.req('open.php?token='+wheel.token),303).location,'wheel.php?game='+wheel.game);
assert.equal(status(await guest.api('view=wheel&game='+wheel.game),200).json.pool[0].name,'Joke');
status(await guest.api('view=mine'),401);
await register(b,'b','boxes');
assert.deepEqual(status(await b.api('view=mine'),200).json.games,[]);
status(await b.api('view=mine&wheel='+wheel.game),404);
status(await b.api('view=wheel&game='+wheel.game),404);
status(await b.req('admin/'),403);
status(await b.req('admin/users.php'),403);
status(await b.api('view=admin'),403);
status(await b.act({action:'game_delete',game:wheel.game,_account_id:mine.games[0].owner_user_id}),404);
status(await b.act({action:'game_rename',game:wheel.game,name:'unauthorized'}),404);
const other=status(await b.act({action:'game_create',kind:'wheel',name:'Other '+tag}),200).json;
status(await b.act({action:'item_save',game:other.game,id:mine.items[0].id,name:'unauthorized',qty:3}),409);
status(await b.req('open.php?token='+wheel.token),303);
status(await b.api('view=wheel&game='+wheel.game),200);
status(await b.api('view=share&game='+wheel.game),404);
status(await b.act({action:'game_rename',game:wheel.game,name:'unauthorized'}),403);
assert.deepEqual(status(await b.api('view=mine'),200).json.games.map(x=>x.id),[other.game]);
status(await b.req('open.php?token='+boxes.token),303);
const box=status(await b.api('view=boxes&game='+boxes.game),200).json.boxes[0];
assert.equal(box.text,undefined);
status(await b.act({action:'box_open',game:boxes.game,id:box.id}),200);
assert.equal(status(await b.api('view=boxes&game='+boxes.game),200).json.boxes[0].text,'Sing');
status(await a.act({action:'game_share',game:wheel.game,kind:'wheel',revoke:1}),200);
status(await guest.api('view=wheel&game='+wheel.game),404);
status(await guest.req('open.php?token='+wheel.token),404);
const rotation=status(await a.act({action:'game_share',game:wheel.game,kind:'wheel',role:'view'}),200).json;
status(await guest.req('open.php?kind=wheel'),200);
status(await guest.form('open.php',{kind:'wheel',code:rotation.code}),303);
status(await a.form('auth/logout.php',{}),303);
status(await a.api('view=mine'),401);
const login='auth/account.php?mode=login&create=boxes';
status(await a.req(login),200);
assert.equal(status(await a.form(login,{email,password}),303).location,'../my/?tab=boxes&create=1');
status(await a.req('my/?tab=boxes&create=1'),200);
assert.equal(status(await a.api('view=mine'),200).json.games.length,2);
status(await operator.req('auth/login.php'),200);
status(await operator.form('auth/login.php',{username:'operator',password:process.env.BOLTX_TEST_ADMIN_PASSWORD}),303);
status(await operator.req('admin/'),200);
const all=status(await operator.api('view=admin'),200).json.games.map(x=>x.id);
assert.ok([wheel.game,boxes.game,other.game].every(id=>all.includes(id)));
assert.match(status(await operator.req('admin/users.php'),200).body,new RegExp(email));
status(await operator.act({action:'game_rename',game:wheel.game,name:'Reviewed '+tag}),200);
status(await a.act({action:'box_reset',game:boxes.game}),200);
status(await a.act({action:'game_delete',game:boxes.game,kind:'boxes'}),200);
status(await b.api('view=boxes&game='+boxes.game),404);
console.log('Passed email registration, redirects, personal ownership, shared play/view, rotation, logout and operator access.');
