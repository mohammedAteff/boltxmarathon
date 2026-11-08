import {$,post} from './common.js';
import './locale.js';
$('#print-list').onclick=()=>print();
const game=Number(document.body.dataset.game);
document.addEventListener('change',async e=>{
    const item=e.target.closest('[data-unit]');
    if(!item) return;
    const checked=item.checked;
    item.disabled=true;
    try{
        await post({action:'checklist',game,id:Number(item.dataset.unit),revision:Number(item.dataset.revision),completed:Number(checked)});
        const section=item.closest('.list-player'),done=section.querySelectorAll('input:checked').length;
        $('.done-count',section).textContent=done;
        $('progress',section).value=done;
        $('#list-status').textContent='';
    }catch(err){item.checked=!checked;$('#list-status').textContent=err.message;}
    finally{item.disabled=false;}
});
