import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    Min,
    IsArray,
    ArrayMinSize,
    ValidateNested,
    IsDateString,
} from 'class-validator';
import {Type} from 'class-transformer';

export class OrderItemDto {
    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    unitPrice?: number;
}

export class OrderReceiptDto {
    @IsNumber()
    orderId: number;

    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    shippingAddress: string;

    @IsString()
    @IsNotEmpty()
    status: string;

    @IsString()
    @IsNotEmpty()
    idempotencyKey: string;

    @IsDateString()
    createdAt: string;

    @IsArray()
    @ArrayMinSize(1, {message: 'Receipt must contain at least one item'})
    @ValidateNested({each: true})
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    companyAddress?: string;

    @IsOptional()
    @IsString()
    companyPhone?: string;
}