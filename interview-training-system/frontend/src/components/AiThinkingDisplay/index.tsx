/**
 * AI思考過程展示組件
 * 悬浮框展示AI思考步骤
 */
import React, { memo } from 'react'
import { Card, Steps, Button, Space } from 'antd'
import { CloseOutlined, MinusOutlined, RobotOutlined } from '@ant-design/icons'
import { useAiThinkingStore } from '../../store/useAiThinkingStore'
import './index.css'

const { Step } = Steps

const AiThinkingDisplay: React.FC = memo(() => {
  const {
    currentTask,
    visible,
    minimized,
    hide,
    toggleMinimize,
  } = useAiThinkingStore()

  // 如果不可见或没有任務，不渲染
  if (!visible || !currentTask) {
    return null
  }

  // 最小化狀態：只显示小图標
  if (minimized) {
    return (
      <div className="ai-thinking-minimized" onClick={toggleMinimize}>
        <RobotOutlined className="ai-thinking-icon" />
      </div>
    )
  }

  return (
    <div className="ai-thinking-display">
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            <span>{currentTask.name}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={toggleMinimize}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={hide}
            />
          </Space>
        }
        className="ai-thinking-card"
      >
        <Steps
          direction="vertical"
          size="small"
          current={currentTask.currentStepIndex}
          status={
            currentTask.steps[currentTask.currentStepIndex]?.status === 'error'
              ? 'error'
              : 'process'
          }
        >
          {currentTask.steps.map((step) => {
            let stepStatus: 'wait' | 'process' | 'finish' | 'error' = 'wait'
            if (step.status === 'completed') {
              stepStatus = 'finish'
            } else if (step.status === 'processing') {
              stepStatus = 'process'
            } else if (step.status === 'error') {
              stepStatus = 'error'
            }

            return (
              <Step
                key={step.id}
                title={step.text}
                status={stepStatus}
                description={
                  step.status === 'processing' ? '处理中...' : undefined
                }
              />
            )
          })}
        </Steps>
      </Card>
    </div>
  )
})

AiThinkingDisplay.displayName = 'AiThinkingDisplay'

export default AiThinkingDisplay
