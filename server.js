const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 创建必要的目录
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

ensureDirectoryExists('./db');
ensureDirectoryExists('./logs');

// 初始化应用
const app = express();
const port = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/data');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 数据库连接
let db;

const initializeDb = async () => {
  // 打开数据库连接
  db = await open({
    filename: './db/fitness_data.db',
    driver: sqlite3.Database
  });

  // 创建需要的表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      grade_id TEXT,
      grade TEXT,
      college TEXT NOT NULL,
      major TEXT,
      class_name TEXT,
      student_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      total_score REAL,
      status TEXT,
      level TEXT,
      height REAL,
      weight REAL,
      height_weight_score REAL,
      height_weight_level TEXT,
      vital_capacity REAL,
      vital_capacity_score REAL,
      vital_capacity_level TEXT,
      sprint_50m REAL,
      sprint_50m_score REAL,
      sprint_50m_level TEXT,
      long_jump REAL,
      long_jump_score REAL,
      long_jump_level TEXT,
      sit_reach REAL,
      sit_reach_score REAL,
      sit_reach_level TEXT,
      run_800m TEXT,
      run_800m_score REAL,
      run_800m_level TEXT,
      run_1000m TEXT,
      run_1000m_score REAL,
      run_1000m_level TEXT,
      situp REAL,
      situp_score REAL,
      situp_level TEXT,
      pullup REAL,
      pullup_score REAL,
      pullup_level TEXT,
      UNIQUE(year, student_id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  console.log('数据库初始化完成');
};

// 添加日志
const addLog = async (action, description) => {
  const timestamp = new Date().toISOString();
  await db.run(
    'INSERT INTO logs (timestamp, action, description) VALUES (?, ?, ?)',
    [timestamp, action, description]
  );
};

// API 路由
// 获取可用年份
app.get('/api/years', async (req, res) => {
  try {
    const years = await db.all('SELECT DISTINCT year FROM students ORDER BY year DESC');
    res.json(years.map(y => y.year));
  } catch (error) {
    console.error('获取年份失败:', error);
    res.status(500).json({ error: '获取年份失败' });
  }
});

// 获取所有学院
app.get('/api/colleges', async (req, res) => {
  try {
    const year = req.query.year;
    let query = 'SELECT DISTINCT college FROM students';
    
    if (year) {
      query += ' WHERE year = ?';
      const colleges = await db.all(query, [year]);
      res.json(colleges.map(c => c.college));
    } else {
      const colleges = await db.all(query);
      res.json(colleges.map(c => c.college));
    }
  } catch (error) {
    console.error('获取学院列表失败:', error);
    res.status(500).json({ error: '获取学院列表失败' });
  }
});

// 获取特定学院的班级
app.get('/api/classes', async (req, res) => {
  try {
    const { year, college } = req.query;
    if (!year || !college) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const classes = await db.all(
      'SELECT DISTINCT class_name FROM students WHERE year = ? AND college = ? ORDER BY class_name',
      [year, college]
    );
    res.json(classes.map(c => c.class_name));
  } catch (error) {
    console.error('获取班级列表失败:', error);
    res.status(500).json({ error: '获取班级列表失败' });
  }
});

// 获取首页统计数据
app.get('/api/stats/overview', async (req, res) => {
  try {
    const { year, gender } = req.query;
    if (!year) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let genderFilter = '';
    const params = [year];

    if (gender && gender !== 'all') {
      genderFilter = ' AND gender = ?';
      params.push(gender);
    }

    // 总体合格率（使用总分≥50作为合格标准）
    const totalQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN total_score >= 50 THEN 1 ELSE 0 END) as passed
      FROM students 
      WHERE year = ?${genderFilter}
    `;
    
    const totalStats = await db.get(totalQuery, params);
    
    // 各学院合格率
    const collegeQuery = `
      SELECT 
        college,
        COUNT(*) as total,
        SUM(CASE WHEN total_score >= 50 THEN 1 ELSE 0 END) as passed
      FROM students 
      WHERE year = ?${genderFilter}
      GROUP BY college
    `;
    
    const collegeStats = await db.all(collegeQuery, params);
    
    // 各项目合格率
    const itemsQuery = `
      SELECT 
        SUM(CASE WHEN height_weight_score >= 50 THEN 1 ELSE 0 END) as height_weight_passed,
        COUNT(*) as height_weight_total,
        
        SUM(CASE WHEN vital_capacity_score >= 50 THEN 1 ELSE 0 END) as vital_capacity_passed,
        COUNT(*) as vital_capacity_total,
        
        SUM(CASE WHEN sprint_50m_score >= 50 THEN 1 ELSE 0 END) as sprint_passed,
        COUNT(*) as sprint_total,
        
        SUM(CASE WHEN long_jump_score >= 50 THEN 1 ELSE 0 END) as long_jump_passed,
        COUNT(*) as long_jump_total,
        
        SUM(CASE WHEN sit_reach_score >= 50 THEN 1 ELSE 0 END) as sit_reach_passed,
        COUNT(*) as sit_reach_total,
        
        SUM(CASE WHEN ((gender = '男' AND run_1000m_score >= 50) OR 
                      (gender = '女' AND run_800m_score >= 50)) THEN 1 ELSE 0 END) as endurance_passed,
        COUNT(*) as endurance_total,
        
        SUM(CASE WHEN ((gender = '男' AND pullup_score >= 50) OR 
                      (gender = '女' AND situp_score >= 50)) THEN 1 ELSE 0 END) as strength_passed,
        COUNT(*) as strength_total
      FROM students
      WHERE year = ?${genderFilter}
    `;
    
    const itemsStats = await db.get(itemsQuery, params);
    
    // 获取各项目的平均分
    const avgScoresQuery = `
      SELECT 
        AVG(height_weight_score) as height_weight_avg,
        AVG(vital_capacity_score) as vital_capacity_avg,
        AVG(sprint_50m_score) as sprint_avg,
        AVG(long_jump_score) as long_jump_avg,
        AVG(sit_reach_score) as sit_reach_avg,
        AVG(CASE WHEN gender = '男' THEN run_1000m_score ELSE run_800m_score END) as endurance_avg,
        AVG(CASE WHEN gender = '男' THEN pullup_score ELSE situp_score END) as strength_avg
      FROM students
      WHERE year = ?${genderFilter}
    `;
    
    const avgScores = await db.get(avgScoresQuery, params);
    
    res.json({
      totalStats,
      collegeStats,
      itemsStats,
      avgScores
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取特定学院或班级的统计数据
app.get('/api/stats/detail', async (req, res) => {
  try {
    const { year, gender, type, college, className } = req.query;
    
    if (!year) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 构建查询条件
    let conditions = ['year = ?'];
    let params = [year];
    
    if (gender && gender !== 'all') {
      conditions.push('gender = ?');
      params.push(gender);
    }
    
    if (type === 'college' && college) {
      conditions.push('college = ?');
      params.push(college);
    } else if (type === 'class' && college && className) {
      conditions.push('college = ?');
      conditions.push('class_name = ?');
      params.push(college, className);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // 获取基本统计信息
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN total_score >= 50 THEN 1 ELSE 0 END) as passed,
        AVG(total_score) as avg_score
      FROM students
      WHERE ${whereClause}
    `;
    
    const stats = await db.get(statsQuery, params);
    
    // 获取所有分数详情，用于生成分布图
    const scoresQuery = `
      SELECT 
        total_score,
        height_weight_score,
        vital_capacity_score,
        sprint_50m_score,
        long_jump_score,
        sit_reach_score,
        CASE WHEN gender = '男' THEN run_1000m_score ELSE run_800m_score END as endurance_score,
        CASE WHEN gender = '男' THEN pullup_score ELSE situp_score END as strength_score
      FROM students
      WHERE ${whereClause}
    `;
    
    const scores = await db.all(scoresQuery, params);
    
    // 获取平均分
    const avgScoresQuery = `
      SELECT 
        AVG(total_score) as total_avg,
        AVG(height_weight_score) as height_weight_avg,
        AVG(vital_capacity_score) as vital_capacity_avg,
        AVG(sprint_50m_score) as sprint_avg,
        AVG(long_jump_score) as long_jump_avg,
        AVG(sit_reach_score) as sit_reach_avg,
        AVG(CASE WHEN gender = '男' THEN run_1000m_score ELSE run_800m_score END) as endurance_avg,
        AVG(CASE WHEN gender = '男' THEN pullup_score ELSE situp_score END) as strength_avg
      FROM students
      WHERE ${whereClause}
    `;
    
    const avgScores = await db.get(avgScoresQuery, params);
    
    res.json({
      stats,
      scores,
      avgScores
    });
  } catch (error) {
    console.error('获取详细统计数据失败:', error);
    res.status(500).json({ error: '获取详细统计数据失败' });
  }
});

// 获取多年趋势数据
app.get('/api/trends', async (req, res) => {
  try {
    const { startYear, endYear, gender, type, college, className } = req.query;
    if (!startYear || !endYear) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let whereClause = 'year >= ? AND year <= ?';
    const params = [startYear, endYear];

    if (gender && gender !== 'all') {
      whereClause += ' AND gender = ?';
      params.push(gender);
    }

    if (type === 'college' && college) {
      whereClause += ' AND college = ?';
      params.push(college);
    } else if (type === 'class' && college && className) {
      whereClause += ' AND college = ? AND class_name = ?';
      params.push(college, className);
    }

    // 按年份统计合格率
    const passRateQuery = `
      SELECT 
        year,
        COUNT(*) as total,
        SUM(CASE WHEN total_score >= 50 THEN 1 ELSE 0 END) as passed
      FROM students 
      WHERE ${whereClause}
      GROUP BY year
      ORDER BY year
    `;
    
    const passRateByYear = await db.all(passRateQuery, params);
    
    // 按年份统计各项目平均分
    const avgScoresByYearQuery = `
      SELECT 
        year,
        AVG(height_weight_score) as height_weight_avg,
        AVG(vital_capacity_score) as vital_capacity_avg,
        AVG(sprint_50m_score) as sprint_avg,
        AVG(long_jump_score) as long_jump_avg,
        AVG(sit_reach_score) as sit_reach_avg,
        AVG(CASE WHEN gender = '男' THEN run_1000m_score ELSE run_800m_score END) as endurance_avg,
        AVG(CASE WHEN gender = '男' THEN pullup_score ELSE situp_score END) as strength_avg,
        AVG(total_score) as total_avg
      FROM students
      WHERE ${whereClause}
      GROUP BY year
      ORDER BY year
    `;
    
    const avgScoresByYear = await db.all(avgScoresByYearQuery, params);
    
    res.json({
      passRateByYear,
      avgScoresByYear
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ error: '获取趋势数据失败' });
  }
});

// 获取各学院平均分
app.get('/api/stats/college-avg', async (req, res) => {
  try {
    const { year, gender } = req.query;
    if (!year) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let genderFilter = '';
    const params = [year];

    if (gender && gender !== 'all') {
      genderFilter = ' AND gender = ?';
      params.push(gender);
    }

    // 查询各学院平均分
    const query = `
      SELECT 
        college,
        AVG(total_score) as avgScore,
        AVG(height_weight_score) as height_weight_avg,
        AVG(vital_capacity_score) as vital_capacity_avg,
        AVG(sprint_50m_score) as sprint_avg,
        AVG(long_jump_score) as long_jump_avg,
        AVG(sit_reach_score) as sit_reach_avg,
        AVG(CASE WHEN gender = '男' THEN run_1000m_score ELSE run_800m_score END) as endurance_avg,
        AVG(CASE WHEN gender = '男' THEN pullup_score ELSE situp_score END) as strength_avg
      FROM students
      WHERE year = ?${genderFilter}
      GROUP BY college
    `;
    
    const collegeAvgScores = await db.all(query, params);
    
    res.json(collegeAvgScores);
  } catch (error) {
    console.error('获取学院平均分失败:', error);
    res.status(500).json({ error: '获取学院平均分失败' });
  }
});

// 处理Excel导入
app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    const year = req.body.year;
    if (!year) {
      return res.status(400).json({ error: '缺少年份参数' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    // 读取Excel文件
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // 开始事务
    await db.exec('BEGIN TRANSACTION');

    // 首先删除该年的数据（如果存在）
    await db.run('DELETE FROM students WHERE year = ?', [year]);
    await addLog('数据导入', `删除 ${year} 年数据，准备重新导入`);

    let importedCount = 0;
    let skippedCount = 0;

    // 从第2行开始解析数据（跳过表头）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length < 10) {
        skippedCount++;
        continue; // 跳过格式不正确的行
      }

      // 解析数据并插入数据库
      try {
        // 解析Excel行数据
        const student = {
          year: parseInt(year),
          grade_id: row[0] || '',
          grade: row[1] || '',
          college: row[2] || '',
          major: row[3] || '',
          class_name: row[4] || '',
          student_id: row[5] || '',
          name: row[6] || '',
          gender: row[7] || '',
          total_score: parseFloat(row[8]) || 0,
          status: row[9] || '',
          level: row[10] || '',
          height: parseFloat(row[11]) || 0,
          weight: parseFloat(row[12]) || 0,
          height_weight_score: parseFloat(row[13]) || 0,
          height_weight_level: row[14] || '',
          vital_capacity: parseFloat(row[15]) || 0,
          vital_capacity_score: parseFloat(row[16]) || 0,
          vital_capacity_level: row[17] || '',
          sprint_50m: parseFloat(row[18]) || 0,
          sprint_50m_score: parseFloat(row[19]) || 0,
          sprint_50m_level: row[20] || '',
          long_jump: parseFloat(row[21]) || 0,
          long_jump_score: parseFloat(row[22]) || 0,
          long_jump_level: row[23] || '',
          sit_reach: parseFloat(row[24]) || 0,
          sit_reach_score: parseFloat(row[25]) || 0,
          sit_reach_level: row[26] || '',
          run_800m: row[27] || '',
          run_800m_score: parseFloat(row[28]) || 0,
          run_800m_level: row[29] || '',
          run_1000m: row[30] || '',
          run_1000m_score: parseFloat(row[31]) || 0,
          run_1000m_level: row[32] || '',
          situp: parseFloat(row[33]) || 0,
          situp_score: parseFloat(row[34]) || 0,
          situp_level: row[35] || '',
          pullup: parseFloat(row[36]) || 0,
          pullup_score: parseFloat(row[37]) || 0,
          pullup_level: row[38] || ''
        };

        // 插入到数据库
        await db.run(`
          INSERT INTO students (
            year, grade_id, grade, college, major, class_name, student_id, name, gender, total_score,
            status, level, height, weight, height_weight_score, height_weight_level,
            vital_capacity, vital_capacity_score, vital_capacity_level,
            sprint_50m, sprint_50m_score, sprint_50m_level,
            long_jump, long_jump_score, long_jump_level,
            sit_reach, sit_reach_score, sit_reach_level,
            run_800m, run_800m_score, run_800m_level,
            run_1000m, run_1000m_score, run_1000m_level,
            situp, situp_score, situp_level,
            pullup, pullup_score, pullup_level
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          student.year, student.grade_id, student.grade, student.college, student.major, 
          student.class_name, student.student_id, student.name, student.gender, student.total_score,
          student.status, student.level, student.height, student.weight, 
          student.height_weight_score, student.height_weight_level,
          student.vital_capacity, student.vital_capacity_score, student.vital_capacity_level,
          student.sprint_50m, student.sprint_50m_score, student.sprint_50m_level,
          student.long_jump, student.long_jump_score, student.long_jump_level,
          student.sit_reach, student.sit_reach_score, student.sit_reach_level,
          student.run_800m, student.run_800m_score, student.run_800m_level,
          student.run_1000m, student.run_1000m_score, student.run_1000m_level,
          student.situp, student.situp_score, student.situp_level,
          student.pullup, student.pullup_score, student.pullup_level
        ]);
        
        importedCount++;
      } catch (error) {
        console.error(`第 ${i+1} 行数据导入失败:`, error);
        skippedCount++;
      }
    }

    // 提交事务
    await db.exec('COMMIT');
    
    // 添加日志
    await addLog('数据导入', `成功导入 ${year} 年数据，共 ${importedCount} 条记录，跳过 ${skippedCount} 条`);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: `成功导入 ${importedCount} 条记录，跳过 ${skippedCount} 条`,
      year,
      importedCount,
      skippedCount
    });
  } catch (error) {
    // 回滚事务
    await db.exec('ROLLBACK');
    console.error('导入数据失败:', error);
    res.status(500).json({ error: '导入数据失败', details: error.message });
  }
});

// 删除特定年份的数据
app.delete('/api/data/:year', async (req, res) => {
  try {
    const year = req.params.year;
    
    // 检查年份是否存在
    const checkResult = await db.get('SELECT COUNT(*) as count FROM students WHERE year = ?', [year]);
    if (checkResult.count === 0) {
      return res.status(404).json({ error: '未找到该年份的数据' });
    }
    
    // 删除数据
    await db.run('DELETE FROM students WHERE year = ?', [year]);
    
    // 添加日志
    await addLog('数据删除', `删除 ${year} 年数据`);
    
    res.json({
      success: true,
      message: `成功删除 ${year} 年数据`
    });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({ error: '删除数据失败' });
  }
});

// 获取数据日志
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
    res.json(logs);
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  }
});

// 启动服务器
initializeDb().then(() => {
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}).catch(err => {
  console.error('初始化数据库失败:', err);
}); 