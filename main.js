const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const static = require('serve-static');
const bodyParser = require('body-parser');
const dbconfig = require('./config/database.json');
const jwt = require('jsonwebtoken');

//database connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: dbconfig.host,
    user: dbconfig.user,
    password: dbconfig.password,
    database: dbconfig.database,
    debug: false
});

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.post('/register', (req, res) =>{
    console.log('post 인식');
    const body = req.body;
    const id = body.id;
    const pw = body.password;
    const classes = body.classes;
    console.log(id,pw,classes);
  
    pool.query('select * from user where id=?',[id],(err,data)=>{
      if(data.length == 0){
          console.log('회원가입 성공');
          pool.query('INSERT INTO user(id, password, classes, nickname) values(?,?,?,?)',[id,pw,classes,id],(err,data)=>{
          
          res.status(200).json(
            {
              "message" : true
            }
          );
          });
      }else{
          console.log('회원가입 실패');
          res.status(200).json(
            {
              "message" : false
            }
          );
          
      }
      
    });
  });

app.post('/login', (req, res)=>{
  const body = req.body;
  const id = body.id;
  const pw = body.pw;
  
  pool.query('select nickname,image from user where id=? and password=?', [id,pw], (err, data)=>{
    if(data.length == 0){ // 로그인 실패
      console.log('로그인 실패');
      res.status(200).json({"nickname" : data[0].nickname, "image": data[0].image});
    }
    else{
      // 로그인 성공
      console.log('로그인 성공');
      pool.query('select nickname,image from user where id=?',[id],(err,data)=>{
        res.status(200).json({"nickname" : data[0].nickname, "image": data[0].image});
      });
      
    }
  });

});


app.post('/login/idcert', (req, res) =>{
  console.log('/login/idcert의 post 인식');
  const body = req.body;
  const id = body.id;

  pool.query('select * from user where id=?',[id],(err,data)=>{
    if(data.length == 0){
        console.log('중복 아이디 없음');
        res.status(200).json(
          {
            "isExist" : false
          }
        );
    }else{
        console.log('중복 아이디 있음');
        res.status(200).json(
          {
            "isExist" : true
          }
        );
    }
  });
});

//게시판 목록
app.get('/boardclass', (req, res) => {
  pool.query('SELECT * FROM board', (err, data) => {
      if (err) {
          res.status(500).send(err);
      } else {
          res.status(200).json(data);
      }
  });
});

app.post('/boardclass/create', (req, res) => {
  const newBoardName = req.body.newtitle;
  const creator = req.body.creater;

  // 이미 존재하는 게시판인지를 확인하는 SELECT 쿼리를 사용하지 않고, 바로 삽입 쿼리를 실행합니다.
  pool.query('INSERT INTO board (name, creater) VALUES (?, ?)', [newBoardName, creator], (err, data) => {
    if (err) {
      // 오류 발생 시, 이미 존재하는 게시판인지 확인합니다.
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('이미 존재하는 게시판입니다.');
        res.status(200).json({"success": false});
      } else {
        console.log('게시판 생성 실패');
        res.status(500).json({"success":false});
      }
    } else {
      console.log('게시판 생성 성공');
      res.status(200).json({"success": true});
    }
  });
});


// 게시글 목록
app.post('/board', (req, res) => {
  const selectedBoard = req.body.name; // 클라이언트에서 선택한 게시판 이름

  pool.query('SELECT _id,author,title,context FROM posts WHERE board = ?', [selectedBoard], (err, data) => {
      if (err) {
          res.status(500).send(err);
      } else {
          res.status(200).json(data);
      }
  });
});

app.post('/checkedboardclass', (req, res) => {
  const selectedBoardID = req.body.id; 

  pool.query('SELECT user,name FROM star WHERE user = ?', [selectedBoardID], (err, data) => {
      if (err) {
          res.status(500).send(err);
      } else {
          res.status(200).json(data);
      }
  });
});

app.post('/getcomments', (req, res) => {
  const selectedPostID = req.body._id; 

  pool.query('SELECT writer,context FROM comment WHERE _id = ?', [selectedPostID], (err, data) => {
      if (err) {
          res.status(500).send(err);
      } else {
          res.status(200).json(data);
      }
  });
});

app.post('/kakaologin', (req, res) => {
  const body = req.body;
  const id = body.id;

  pool.query('SELECT id from user WHERE id = ?', [id], (err, data) => {
    if (data.length != 0) {
      console.error(err);
        console.log('이미 존재하는 아이디입니다.');
        res.status(200).json({"message": true});
    } else {
      console.log('존재하지 않는 아이디입니다 -> 새로운 페이지 이동');
      res.status(200).json({"success": false});
    }
  });

});

app.post('/kakaoregister', (req, res) => {
  const userID = req.body.id; 
  const userProfile = req.body.profile;
  const userClass = req.body.classes;
  const userNickname = req.body.nickname;
  console.log(userID,userProfile,userClass,userNickname);
  pool.query('INSERT INTO user(id, image, classes, nickname) values(?,?,?,?)', [userID,userProfile,userClass,userNickname], (err, data) => {
      if (err) {
          res.status(500).json({"message": false});
      } else {
          res.status(200).json({"message": true});
      }
  });
});



app.listen(4000, () => {
    console.log('server is running');
});