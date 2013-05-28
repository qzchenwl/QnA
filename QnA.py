import web
import json
from datetime import datetime

class CJsonEncoder(json.JSONEncoder):
   def default(self, obj):
       if isinstance(obj, datetime):
           return obj.strftime('%Y-%m-%d %H:%M:%S')
       elif isinstance(obj, date):
           return obj.strftime('%Y-%m-%d')
       else:
           return json.JSONEncoder.default(self, obj)

db = web.database(dbn='mysql', db='test', user='root', pw='123456')

urls = (
        '/', 'index',
        '/question-list', 'question_list',
        '/question-answers', 'question_answers',
        '/ask-question', 'ask_question',
        '/answer-question', 'answer_question',
        )

app = web.application(urls, globals())

class index:
    def GET(self):
        raise web.seeother('/static/index.html')

class question_list:
    def GET(self):
        Qs = list(db.select('question', order="update_time DESC"))
        for q in Qs: q['tags'] = q['tags'].split(',')
        return json.dumps({"questions": Qs, "pages": 10, "current_page": 5}, cls=CJsonEncoder)


class question_answers:
    def GET(self):
        dbvars = web.input('id')
        qs = list(db.select('question', dbvars, where="id = $id"))
        q = qs[0]
        q['tags'] = q['tags'].split(',')
        answers = list(db.select('answer', dbvars, where='question_id = $id'))
        q['answers'] = answers
        return json.dumps({"question_answers": q}, cls=CJsonEncoder)

class ask_question:
    def GET(self):
        dbvars = web.input()
        if not dbvars['title']:
            dbvars['title'] = 'ooops, no title'
        Qid = db.insert('question', title=dbvars['title'], content = dbvars['content'], tags=dbvars['tags'], who='annoymous')
        return json.dumps({'id': Qid})

class answer_question:
    def GET(self):
        dbvars = web.input()
        Aid = db.insert('answer', question_id=int(dbvars['question_id']), content=dbvars['content'], who = 'annoymous')
        return json.dumps({'id': dbvars['question_id']})


if __name__ == '__main__':
    app.run()
