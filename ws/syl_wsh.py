from Queue import Queue
from __builtin__ import eval
import datetime
import math
import os
import re
import thread
import time
import urllib

import redis
import simplejson


CHAT_LOG = '/var/log/syl/chat/'
NOTICE_LOG = '/var/log/syl/notice/'
pool = redis.ConnectionPool(host='127.0.0.1', port=6379, max_connections=10)
def get_redis():
    return redis.Redis(connection_pool=pool)

CMD_CNF = set([
    'CHAT' , 'CHECK_OL', 'APPLY_GROUP', 'APPROVE_USER', 'HEART_BEAT', 'ACK', 'CHAT_LOG', 'HACK_NOTICE'
]);


user_request = {}
request_user = {}

def web_socket_do_extra_handshake(request):
    if(re.match(r'^/syl\?i=[0-9]+&t=[a-z0-9]+$', request.uri)):
        param = request.uri.split('?')[1]
        params = param.split('&') 
        uid = params[0].split('=')[1]
        token = params[1].split('=')[1]
        if(token == get_redis().hget('u_' + uid, 't')):
            __add_uid_req(uid, request)
            return
    request.ws_stream.close_connection(0, 'illegal connect')

def __add_uid_req(uid, request):
    ts = time.time()
    user_request[str(uid)] = {'req':request, 'ts':ts}
    request_user[request] = {'uid':uid, 'ts':ts}
    
def web_socket_passive_closing_handshake(request):
    uid = __get_uid(request)
    if(uid):
        __remove_user(uid)
        print(uid + ' closed')
        
    
def __remove_user(uid):
    req = __get_req(uid)
    if(req):
        del request_user[req]
    if(user_request.has_key(uid)):
        del user_request[uid]
            
def __get_uid(req):
    if(request_user.has_key(req)):
        return request_user[req]['uid']
    
def __get_req(uid):
    if(user_request.has_key(str(uid))):
        return user_request[str(uid)]['req']
    
   
def __send_msg(uid, msg):
    req = __get_req(uid)
    if(req):
        try:
            print(str(uid) + msg['cmd'])
            req.ws_stream.send_message(simplejson.dumps(msg), binary=False)
            return True
        except Exception as e:
            __remove_user(uid)
    return False


def web_socket_transfer_data(request):
    try:
        while True:
            line = request.ws_stream.receive_message()
            if line is None:
                return
            if isinstance(line, unicode):
                ws_dispatch(line, request)
            else:
                # request.ws_stream.send_message(line, binary=True)
                pass
    except Exception as e:
        print(e)
    

            
def notice_thread():
    while True:
        notice = get_redis().rpop('notice')
        if(notice):
            try:
                n_dict = simplejson.loads(notice)
                if(n_dict['cmd'] in CMD_CNF):
                    user_exists = user_request.has_key(str(n_dict['to']))
                    if(user_exists):
                        eval(n_dict['cmd'].lower())(n_dict)
                    else:
                        if(n_dict['t'] == 2 and time.time() < n_dict['ex']):
                            get_redis().lpush('notice60' , notice)
            except Exception as e:
                print(e)
        else:
            time.sleep(5)

def notice60_thread():
    notice60_key = 'notice60'
    while True:
        notice = get_redis().rpop(notice60_key)
        other_key = 'notice60_bak' if notice60_key == 'notice60' else 'notice60'
        if(notice):
            try:
                n_dict = simplejson.loads(notice)
                if(n_dict['cmd'] in CMD_CNF):
                    user_exists = user_request.has_key(str(n_dict['to']))
                    if(user_exists):
                        eval(n_dict['cmd'].lower())(n_dict)
                    else:
                        if(n_dict['t'] == 2 and time.time() < n_dict['ex']):
                            get_redis().lpush(other_key, notice)
            except Exception as e:
                print(e)
        else:
            notice60_key = other_key
            time.sleep(10)
        
def heart_beat_thread():
    while True:
        die_list = []
        for uid in user_request:
            if(not __send_msg(uid, {'cmd':'HEART_BEAT'})):
                die_list.append(uid)
        if(die_list):
            for uid in die_list:
                __remove_user(uid)
        time.sleep(10)
            
thread.start_new_thread(notice_thread, ())
thread.start_new_thread(notice60_thread, ())
thread.start_new_thread(heart_beat_thread, ())

def ws_dispatch(line, request):
    msg = simplejson.loads(line)
    if(msg):
        if(msg['cmd'] in CMD_CNF):
            eval(msg['cmd'].lower())(request, msg)
        

def apply_group(n_dict):
    __send_msg(str(n_dict['to']), n_dict)

def approve_user(n_dict):
    __send_msg(n_dict['to'], n_dict)
    
def check_ol(request, msg):
    friendids = get_redis().get('f_' + str(msg['uid']))
    if(not friendids):return None
    ids = friendids.split(',')
    ols = []
    for id in ids:
        if(__get_req(id)):
            ols.append(id)  
    __send_msg(msg['uid'], {'cmd':msg['cmd'], 'uids':ols})

def get_chat_file(uid):
    t = time.strftime('%Y%m%d')
    return open(CHAT_LOG + t + '-chat-' + str(uid), 'a')

def get_notice_file(uid, t='r'):
    return open(NOTICE_LOG + '-notice-' + str(uid), 'a')


def chat(request, msg):
    t = int(time.time())
    msg['t'] = t
    if(isinstance(msg['to'], list)):
        for to in msg['to']:
            msg['to'] = to
            __send_msg(to, msg)
            get_chat_file(to).write(simplejson.dumps(msg) + '\n')
    else:
        __send_msg(msg['to'], msg)
        get_chat_file(msg['to']).write(simplejson.dumps(msg) + '\n')
        
    f_msg = {'cmd':'CHAT_ACK', 't':t, 'from':msg['from'], 'to':msg['gid'] if msg['gid'] else msg['to'] }
    __send_msg(msg['from'], f_msg)
    f_msg['msg'] = msg['msg']
    get_chat_file(msg['from']).write(simplejson.dumps(f_msg) + '\n')
    
def chat_log(request, msg):
    msgs = {}
    now = time.time()
    DAY_TIME = 24 * 60 * 60
    if(msg['d']):
        # print(msg['d'])
        last_time = time.mktime(datetime.datetime.strptime(msg['d'], '%Y%m%d').timetuple())
    else:
        last_time = now - DAY_TIME * 30
    
    days = int(math.ceil((now - last_time) / DAY_TIME))
    for i in range(days):
        last_str = time.strftime('%Y%m%d', time.localtime(last_time + i * DAY_TIME))
        path = CHAT_LOG + last_str + '-chat-' + str(msg['uid'])
        if(os.path.isfile(path)):
            file = open(path, 'r') 
            lines = file.readlines()
            if(i == 0 and msg['ln']):
                lines = lines[msg['ln']:]
            msgs[last_str] = lines
    msg['msgs'] = msgs
    __send_msg(msg['uid'], msg)
    
def hack_notice(request, msg):
    if(request_user[request]['uid'] == '100000'):
        for uid in user_request:
            __send_msg(uid, msg)
