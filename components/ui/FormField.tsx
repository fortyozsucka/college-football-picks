'use client'

import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  HStack,
  useColorModeValue,
  InputProps,
  SelectProps,
  TextareaProps
} from '@chakra-ui/react'
import { ReactNode } from 'react'

interface BaseFieldProps {
  label?: string
  error?: string | null
  helperText?: string
  isRequired?: boolean
  isDisabled?: boolean
  children?: ReactNode
}

interface InputFieldProps extends BaseFieldProps, Omit<InputProps, 'isRequired' | 'isDisabled'> {}
interface SelectFieldProps extends BaseFieldProps, Omit<SelectProps, 'isRequired' | 'isDisabled'> {
  options: Array<{ value: string | number; label: string; disabled?: boolean }>
}
interface TextareaFieldProps extends BaseFieldProps, Omit<TextareaProps, 'isRequired' | 'isDisabled'> {}
interface NumberFieldProps extends BaseFieldProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  precision?: number
}
interface SwitchFieldProps extends BaseFieldProps {
  isChecked: boolean
  onChange: (checked: boolean) => void
  switchPosition?: 'left' | 'right'
}

function FieldWrapper({ label, error, helperText, isRequired, children }: BaseFieldProps) {
  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      {label && (
        <FormLabel mb={2} fontWeight="semibold">
          {label}
        </FormLabel>
      )}
      {children}
      {error && <FormErrorMessage mt={1}>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText mt={1}>{helperText}</FormHelperText>}
    </FormControl>
  )
}

export function InputField({ 
  label, 
  error, 
  helperText, 
  isRequired, 
  isDisabled,
  ...inputProps 
}: InputFieldProps) {
  const focusBorderColor = useColorModeValue('brand.500', 'brand.300')
  
  return (
    <FieldWrapper 
      label={label} 
      error={error} 
      helperText={helperText} 
      isRequired={isRequired}
    >
      <Input
        {...inputProps}
        isDisabled={isDisabled}
        focusBorderColor={focusBorderColor}
        errorBorderColor="red.400"
      />
    </FieldWrapper>
  )
}

export function SelectField({ 
  label, 
  error, 
  helperText, 
  isRequired, 
  isDisabled,
  options,
  placeholder = 'Select an option',
  ...selectProps 
}: SelectFieldProps) {
  const focusBorderColor = useColorModeValue('brand.500', 'brand.300')
  
  return (
    <FieldWrapper 
      label={label} 
      error={error} 
      helperText={helperText} 
      isRequired={isRequired}
    >
      <Select
        {...selectProps}
        isDisabled={isDisabled}
        focusBorderColor={focusBorderColor}
        errorBorderColor="red.400"
        placeholder={placeholder}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </Select>
    </FieldWrapper>
  )
}

export function TextareaField({ 
  label, 
  error, 
  helperText, 
  isRequired, 
  isDisabled,
  ...textareaProps 
}: TextareaFieldProps) {
  const focusBorderColor = useColorModeValue('brand.500', 'brand.300')
  
  return (
    <FieldWrapper 
      label={label} 
      error={error} 
      helperText={helperText} 
      isRequired={isRequired}
    >
      <Textarea
        {...textareaProps}
        isDisabled={isDisabled}
        focusBorderColor={focusBorderColor}
        errorBorderColor="red.400"
      />
    </FieldWrapper>
  )
}

export function NumberField({ 
  label, 
  error, 
  helperText, 
  isRequired, 
  isDisabled,
  value,
  onChange,
  min,
  max,
  step = 1,
  precision
}: NumberFieldProps) {
  const focusBorderColor = useColorModeValue('brand.500', 'brand.300')
  
  return (
    <FieldWrapper 
      label={label} 
      error={error} 
      helperText={helperText} 
      isRequired={isRequired}
    >
      <NumberInput
        value={value}
        onChange={(_, valueNumber) => onChange(valueNumber || 0)}
        min={min}
        max={max}
        step={step}
        precision={precision}
        isDisabled={isDisabled}
        focusBorderColor={focusBorderColor}
        errorBorderColor="red.400"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FieldWrapper>
  )
}

export function SwitchField({ 
  label, 
  error, 
  helperText, 
  isRequired, 
  isDisabled,
  isChecked,
  onChange,
  switchPosition = 'right'
}: SwitchFieldProps) {
  const content = (
    <HStack justify="space-between" w="full">
      {switchPosition === 'left' && (
        <Switch
          isChecked={isChecked}
          onChange={(e) => onChange(e.target.checked)}
          isDisabled={isDisabled}
          colorScheme="brand"
        />
      )}
      {label && <FormLabel mb={0} flex="1">{label}</FormLabel>}
      {switchPosition === 'right' && (
        <Switch
          isChecked={isChecked}
          onChange={(e) => onChange(e.target.checked)}
          isDisabled={isDisabled}
          colorScheme="brand"
        />
      )}
    </HStack>
  )
  
  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      {content}
      {error && <FormErrorMessage mt={1}>{error}</FormErrorMessage>}
      {helperText && !error && <FormHelperText mt={1}>{helperText}</FormHelperText>}
    </FormControl>
  )
}