import web
import pymongo
import json
import re
from datetime import datetime
from pymongo.objectid import ObjectId


class CJsonEncoder(json.JSONEncoder):
   def default(self, obj):
       if isinstance(obj, datetime):
           return obj.strftime('%Y-%m-%d %H:%M:%S')
       elif isinstance(obj, ObjectId):
           return str(obj)
       else:
           return json.JSONEncoder.default(self, obj)

connection = pymongo.MongoClient()
db = connection['QnA']['questions']

urls = (
        '/', 'index',
        '/question-list', 'question_list',
        '/question-answers', 'question_answers',

        '/ask-question', 'ask_question',
        '/answer-question', 'answer_question',

        '/update-question', 'update_question',
        '/update-answer', 'update_answer',
        )

app = web.application(urls, globals())

class index:
    def GET(self):
        raise web.seeother('/static/index.html')

class question_list:
    def GET(self):
        questions = list(db.find().sort('update_time', pymongo.DESCENDING))
        for q in questions: q['id'] = q['_id']
        return json.dumps({'questions': questions}, cls=CJsonEncoder)
        #
        # return json.dumps(list(db.find()), cls=CJsonEncoder)
        # Qs = list(db.select('question', order="update_time DESC"))
        # for q in Qs: q['tags'] = q['tags'].split(',')
        # return json.dumps({"questions": Qs, "pages": 10, "current_page": 5}, cls=CJsonEncoder)

class question_answers:
    def GET(self):
        q = web.input('id')
        question = db.find_one({'_id': ObjectId(q['id'])})
        question['id'] = question['_id']
        return json.dumps({'question_answers': question}, cls=CJsonEncoder)

class ask_question:
    def GET(self):
        q = web.input()
        question = {'title': q['title'],
                    'content': q['content'],
                    'tags': filter(lambda x: x != "", re.split('\s*,\s*',q['tags'])),
                    'who': 'annoymous',
                    'update_time': datetime.utcnow()
                    }
        qid = db.insert(question)
        return json.dumps({'id': qid}, cls=CJsonEncoder)

class answer_question:
    def GET(self):
        q = web.input()
        answer = {
            'id': ObjectId(),
            'content': q['content'],
            'who': 'annoymous',
            'update_time': datetime.utcnow()
        }
        db.update({'_id': ObjectId(q['question_id'])}, {'$push': {'answers': answer}})
        return json.dumps({'id': q['question_id']})

class update_answer:
    def GET(self):
        q = web.input()
        result = db.update({'answers.id': ObjectId(q['id'])}, {'$set': {'answers.$.content': q['content']}})
        question = db.find_one({'answers.id': ObjectId(q['id'])})
        return json.dumps({'id': question['_id']}, cls=CJsonEncoder)


if __name__ == '__main__':
    app.run()
