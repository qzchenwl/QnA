import web
import pymongo
import json
import re
import requests
from datetime import datetime
from pymongo.objectid import ObjectId

web.config.debug = False
urls = (
    '/', 'index',
    '/auth/login', 'auth_login',
    '/auth/logout', 'auth_logout',
    '/test', 'test',

    '/question-list', 'question_list',
    '/question-answers', 'question_answers',

    '/ask-question', 'ask_question',
    '/answer-question', 'answer_question',

    '/update-question', 'update_question',
    '/update-answer', 'update_answer',

    '/vote-question', 'vote_question',
    '/vote-answer', 'vote_answer',
)

app = web.application(urls, globals())
session = web.session.Session(app, web.session.DiskStore('sessions'))

audience = ''
connection = pymongo.MongoClient()
db = connection['QnA']['questions']


class CJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, ObjectId):
            return str(obj)
        else:
            return json.JSONEncoder.default(self, obj)


class index:
    def GET(self):
        raise web.seeother('/static/index.html')


class auth_login:
    def POST(self):
        q = web.input()
        if 'assertion' not in q:
            raise web.notfound()
        data = {'assertion': q['assertion'], 'audience': 'http://chenwl.local:8080'}
        resp = requests.post('https://verifier.login.persona.org/verify', data=data, verify=True)
        if resp.ok:
            verification_data = json.loads(resp.content)
            if verification_data['status'] == 'okay':
                session.email = verification_data['email']
            return resp.content

        raise web.internalerror(resp.content)


class auth_logout:
    def POST(self):
        web.setcookie('email', '', expires=-1)
        session.kill()
        return 'logged out'


class test:
    def GET(self):
        return session.email


class question_list:
    def GET(self):
        questions = list(db.find().sort('update_time', pymongo.DESCENDING))
        for q in questions: q['id'] = q['_id']
        return json.dumps({'questions': questions}, cls=CJsonEncoder)


class question_answers:
    def GET(self):
        q = web.input('id')
        question = db.find_one({'_id': ObjectId(q['id'])})
        question['id'] = question['_id']
        return json.dumps({'question_answers': question}, cls=CJsonEncoder)


class ask_question:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        question = {'title': q['title'],
                    'content': q['content'],
                    'tags': filter(lambda x: x != "", re.split('\s*,\s*', q['tags'])),
                    'who': session.email,
                    'update_time': datetime.now()
        }
        qid = db.insert(question)
        return json.dumps({'id': qid}, cls=CJsonEncoder)


class answer_question:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        answer = {
            'id': ObjectId(),
            'content': q['content'],
            'who': session.email,
            'update_time': datetime.now()
        }
        db.update({'_id': ObjectId(q['question_id'])}, {'$push': {'answers': answer}})
        return json.dumps({'id': q['question_id']})


class update_answer:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        db.update({'answers.id': ObjectId(q['id'])}, {'$set': {'answers.$.content': q['content']}})
        question = db.find_one({'answers.id': ObjectId(q['id'])})
        return json.dumps({'id': question['_id']}, cls=CJsonEncoder)


class update_question:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        db.update({'_id': ObjectId(q['id'])}, {'$set': {'content': q['content']}})
        return json.dumps({'id': q['id']}, cls=CJsonEncoder)


class vote_question:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        oid = ObjectId(q['id'])
        email = session.email
        if q['vote'] == "1":
            db.update({'_id': oid}, {'$pull': {'down_voters': email}})
            db.update({'_id': oid}, {'$addToSet': {'up_voters': email}})
        else:
            db.update({'_id': oid}, {'$pull': {'up_voters': email}})
            db.update({'_id': oid}, {'$addToSet': {'down_voters': email}})
        question = db.find_one({'_id': oid})
        vote = len(question['up_voters']) - len(question['down_voters'])
        db.update({'_id': oid}, {'$set': {'vote_count': vote}})
        return json.dumps({'id': q['id']}, cls=CJsonEncoder)


class vote_answer:
    def GET(self):
        if 'email' not in session:
            raise web.internalerror('please login')
        q = web.input()
        oid = ObjectId(q['id'])
        email = session.email
        if q['vote'] == "1":
            db.update({'answers.id': oid}, {'$pull': {'answers.$.down_voters': email}})
            db.update({'answers.id': oid}, {'$addToSet': {'answers.$.up_voters': email}})
        else:
            db.update({'answers.id': oid}, {'$pull': {'answers.$.up_voters': email}})
            db.update({'answers.id': oid}, {'$addToSet': {'answers.$.down_voters': email}})
        answer = db.find_one({'answers.id': oid}, {'answers': {'$slice': 1}})['answers'][0]
        vote = len(answer['up_voters']) - len(answer['down_voters'])
        db.update({'answers.id': oid}, {'$set': {'answers.$.vote_count': vote}})
        question = db.find_one({'answers.id': oid})

        return json.dumps({'id': question['_id']}, cls=CJsonEncoder)


if __name__ == '__main__':
    audience = 'http://chenwl.local:8080'
    app.run()
