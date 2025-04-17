// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 初始化年份选择器
        const defaultYear = await loadYears('year-select');
        if (!defaultYear) {
            alert('没有可用的数据，请先导入数据');
            return;
        }
        
        // 初始化学院选择器
        await loadColleges('college-one-select', defaultYear);
        await loadColleges('college-two-select', defaultYear);
        await loadColleges('college-for-class-one', defaultYear);
        await loadColleges('college-for-class-two', defaultYear);
        
        // 初始化班级选择器
        const defaultCollegeOne = document.getElementById('college-for-class-one').value;
        const defaultCollegeTwo = document.getElementById('college-for-class-two').value;
        
        if (defaultCollegeOne) {
            await loadClasses('class-one-select', defaultYear, defaultCollegeOne);
        }
        
        if (defaultCollegeTwo) {
            await loadClasses('class-two-select', defaultYear, defaultCollegeTwo);
        }
        
        // 绑定事件监听器
        document.getElementById('year-select').addEventListener('change', handleYearChange);
        document.getElementById('gender-select').addEventListener('change', updateComparison);
        document.getElementById('comparison-type').addEventListener('change', handleComparisonTypeChange);
        
        document.getElementById('college-one-select').addEventListener('change', updateComparison);
        document.getElementById('college-two-select').addEventListener('change', updateComparison);
        
        document.getElementById('college-for-class-one').addEventListener('change', handleCollegeForClassOneChange);
        document.getElementById('college-for-class-two').addEventListener('change', handleCollegeForClassTwoChange);
        document.getElementById('class-one-select').addEventListener('change', updateComparison);
        document.getElementById('class-two-select').addEventListener('change', updateComparison);
        
        document.getElementById('compare-button').addEventListener('click', updateComparison);
        
        // 初始化对比类型视图
        handleComparisonTypeChange();
    } catch (error) {
        console.error('页面初始化失败:', error);
        alert('页面初始化失败: ' + error.message);
    }
});

// 处理年份变化
async function handleYearChange() {
    const year = document.getElementById('year-select').value;
    if (!year) return;
    
    try {
        // 重新加载所有学院下拉框
        await loadColleges('college-one-select', year);
        await loadColleges('college-two-select', year);
        await loadColleges('college-for-class-one', year);
        await loadColleges('college-for-class-two', year);
        
        // 重新加载班级下拉框
        const collegeForClassOne = document.getElementById('college-for-class-one').value;
        const collegeForClassTwo = document.getElementById('college-for-class-two').value;
        
        if (collegeForClassOne) {
            await loadClasses('class-one-select', year, collegeForClassOne);
        }
        
        if (collegeForClassTwo) {
            await loadClasses('class-two-select', year, collegeForClassTwo);
        }
    } catch (error) {
        console.error('处理年份变化失败:', error);
    }
}

// 处理对比类型变化
function handleComparisonTypeChange() {
    const comparisonType = document.getElementById('comparison-type').value;
    const collegeComparisonGroup = document.getElementById('college-comparison-group');
    const classComparisonGroup = document.getElementById('class-comparison-group');
    
    if (comparisonType === 'college') {
        collegeComparisonGroup.style.display = 'flex';
        classComparisonGroup.style.display = 'none';
    } else if (comparisonType === 'class') {
        collegeComparisonGroup.style.display = 'none';
        classComparisonGroup.style.display = 'flex';
    }
}

// 处理班级一学院变化
async function handleCollegeForClassOneChange() {
    const year = document.getElementById('year-select').value;
    const collegeForClassOne = document.getElementById('college-for-class-one').value;
    
    if (year && collegeForClassOne) {
        try {
            await loadClasses('class-one-select', year, collegeForClassOne);
        } catch (error) {
            console.error('加载班级失败:', error);
        }
    }
}

// 处理班级二学院变化
async function handleCollegeForClassTwoChange() {
    const year = document.getElementById('year-select').value;
    const collegeForClassTwo = document.getElementById('college-for-class-two').value;
    
    if (year && collegeForClassTwo) {
        try {
            await loadClasses('class-two-select', year, collegeForClassTwo);
        } catch (error) {
            console.error('加载班级失败:', error);
        }
    }
}

// 更新对比结果
async function updateComparison() {
    try {
        const year = document.getElementById('year-select').value;
        const gender = document.getElementById('gender-select').value;
        const comparisonType = document.getElementById('comparison-type').value;
        
        if (!year) {
            alert('请选择有效的年份');
            return;
        }
        
        let itemOneData, itemTwoData;
        let itemOneLabel, itemTwoLabel;
        
        // 获取两个对比项的数据
        if (comparisonType === 'college') {
            const collegeOne = document.getElementById('college-one-select').value;
            const collegeTwo = document.getElementById('college-two-select').value;
            
            if (!collegeOne || !collegeTwo) {
                alert('请选择有效的学院');
                return;
            }
            
            itemOneLabel = collegeOne;
            itemTwoLabel = collegeTwo;
            
            itemOneData = await fetchAPI(`/stats/detail?year=${year}&gender=${gender}&type=college&college=${encodeURIComponent(collegeOne)}`);
            itemTwoData = await fetchAPI(`/stats/detail?year=${year}&gender=${gender}&type=college&college=${encodeURIComponent(collegeTwo)}`);
        } else if (comparisonType === 'class') {
            const collegeForClassOne = document.getElementById('college-for-class-one').value;
            const classOne = document.getElementById('class-one-select').value;
            const collegeForClassTwo = document.getElementById('college-for-class-two').value;
            const classTwo = document.getElementById('class-two-select').value;
            
            if (!collegeForClassOne || !classOne || !collegeForClassTwo || !classTwo) {
                alert('请选择有效的班级');
                return;
            }
            
            itemOneLabel = classOne;
            itemTwoLabel = classTwo;
            
            itemOneData = await fetchAPI(`/stats/detail?year=${year}&gender=${gender}&type=class&college=${encodeURIComponent(collegeForClassOne)}&className=${encodeURIComponent(classOne)}`);
            itemTwoData = await fetchAPI(`/stats/detail?year=${year}&gender=${gender}&type=class&college=${encodeURIComponent(collegeForClassTwo)}&className=${encodeURIComponent(classTwo)}`);
        }
        
        // 更新合格率对比
        updatePassRateComparison(itemOneLabel, itemTwoLabel, itemOneData.stats, itemTwoData.stats);
        
        // 渲染对比雷达图
        renderComparisonRadarChart(itemOneLabel, itemTwoLabel, itemOneData.avgScores, itemTwoData.avgScores);
        
        // 渲染分项对比柱状图
        renderComparisonBarChart(itemOneLabel, itemTwoLabel, itemOneData.avgScores, itemTwoData.avgScores);
    } catch (error) {
        console.error('更新对比结果失败:', error);
        alert('更新对比结果失败: ' + error.message);
    }
}

// 更新合格率对比
function updatePassRateComparison(itemOneLabel, itemTwoLabel, itemOneStats, itemTwoStats) {
    document.getElementById('item-one-label').textContent = itemOneLabel;
    document.getElementById('item-two-label').textContent = itemTwoLabel;
    
    // 合格标准: 各项目分数达到或超过50分视为合格
    const itemOnePassRate = calculatePassRate(itemOneStats.passed, itemOneStats.total);
    const itemTwoPassRate = calculatePassRate(itemTwoStats.passed, itemTwoStats.total);
    
    document.getElementById('item-one-pass-rate').textContent = formatPercent(itemOnePassRate);
    document.getElementById('item-two-pass-rate').textContent = formatPercent(itemTwoPassRate);
}

// 渲染对比雷达图
function renderComparisonRadarChart(itemOneLabel, itemTwoLabel, itemOneScores, itemTwoScores) {
    const chart = initChart('comparison-radar-chart');
    if (!chart) return;
    
    const radarData = [
        {
            name: itemOneLabel,
            value: [
                itemOneScores.height_weight_avg || 0,
                itemOneScores.vital_capacity_avg || 0,
                itemOneScores.sprint_avg || 0,
                itemOneScores.long_jump_avg || 0,
                itemOneScores.sit_reach_avg || 0,
                itemOneScores.endurance_avg || 0,
                itemOneScores.strength_avg || 0
            ],
            itemStyle: {
                color: '#3498db'
            },
            areaStyle: {
                color: 'rgba(52, 152, 219, 0.3)'
            }
        },
        {
            name: itemTwoLabel,
            value: [
                itemTwoScores.height_weight_avg || 0,
                itemTwoScores.vital_capacity_avg || 0,
                itemTwoScores.sprint_avg || 0,
                itemTwoScores.long_jump_avg || 0,
                itemTwoScores.sit_reach_avg || 0,
                itemTwoScores.endurance_avg || 0,
                itemTwoScores.strength_avg || 0
            ],
            itemStyle: {
                color: '#e74c3c'
            },
            areaStyle: {
                color: 'rgba(231, 76, 60, 0.3)'
            }
        }
    ];
    
    const legendData = [itemOneLabel, itemTwoLabel];
    const option = generateRadarChartOption(radarData, '体测成绩对比雷达图', legendData);
    chart.setOption(option);
    
    // 适应容器大小
    window.addEventListener('resize', () => chart.resize());
}

// 渲染分项对比柱状图
function renderComparisonBarChart(itemOneLabel, itemTwoLabel, itemOneScores, itemTwoScores) {
    const chart = initChart('comparison-bar-chart');
    if (!chart) return;

    const items = [
        { name: '总分', key: 'total_avg' },
        { name: '体重身高', key: 'height_weight_avg' },
        { name: '肺活量', key: 'vital_capacity_avg' },
        { name: '50米跑', key: 'sprint_avg' },
        { name: '立定跳远', key: 'long_jump_avg' },
        { name: '坐位体前屈', key: 'sit_reach_avg' },
        { name: '长跑', key: 'endurance_avg' },
        { name: '力量', key: 'strength_avg' }
    ];

    const option = {
        title: {
            text: '分项成绩对比',
            textStyle: {
                fontSize: 16
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: [itemOneLabel, itemTwoLabel],
            bottom: 10
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '分数',
            min: 0,
            max: 100
        },
        yAxis: {
            type: 'category',
            data: items.map(item => item.name)
        },
        series: [
            {
                name: itemOneLabel,
                type: 'bar',
                data: items.map(item => itemOneScores[item.key] || 0)
            },
            {
                name: itemTwoLabel,
                type: 'bar',
                data: items.map(item => itemTwoScores[item.key] || 0)
            }
        ]
    };

    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
} 